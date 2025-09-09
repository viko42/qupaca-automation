import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Card,
  Input,
  Modal,
  notification,
  Popconfirm,
  Space,
  Typography,
  Row,
  Col,
  Switch,
  Select,
  Slider,
} from "antd";
import {
  WalletOutlined,
  PlusOutlined,
  SendOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExportOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { ethers } from "ethers";
import { useAccount, useBalance, useWalletClient } from "wagmi";
import axios from "axios";
import "./index.css";
import { SLOT_ABI } from "../../contracts/slots/abi";
import { SLOT_ADDRESS } from "../../contracts/slots/address";

const { Title, Text } = Typography;
const { Option } = Select;

const RPC_URL = "http://localhost:3500/rpc";
const JACKPOT_VERIFY_URL = "http://localhost:3500/calculate-hash";

const singletonProvider = new ethers.JsonRpcProvider(RPC_URL);
const contractCache = new Map<string, ethers.Contract>();

interface GameWallet {
  id: string;
  name: string;
  address: string;
  encryptedPrivateKey: string;
  balance: string;
  transactions: number;
  totalSent: string;
  totalGasFees: string;
  createdAt: number;
}

interface TransactionRecord {
  hash: string;
  timestamp: number;
  amount: string;
  walletId: string;
  walletName: string;
  game: string;
  status: "pending" | "success" | "failed";
  verification?: "pending" | "won" | "no_jackpot";
  verifying?: boolean;
  lastVerificationAt?: number;
}

const WalletsPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: walletClient } = useWalletClient();

  const [gameWallets, setGameWallets] = useState<GameWallet[]>([]);
  const [password, setPassword] = useState<string>("");
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [newWalletName, setNewWalletName] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [automationIntervals, setAutomationIntervals] = useState<{
    [key: string]: NodeJS.Timeout;
  }>({});
  const [transactionHistory, setTransactionHistory] = useState<
    TransactionRecord[]
  >([]);
  const [automationSettings, setAutomationSettings] = useState<{
    [walletId: string]: {
      isRunning: boolean;
      transactionsPerMinute: number;
      ethPerBet: number;
      targetGame: string;
    };
  }>({});

  const [showExportPKModal, setShowExportPKModal] = useState<boolean>(false);
  const [selectedWalletForPK, setSelectedWalletForPK] =
    useState<GameWallet | null>(null);
  const [decryptedPK, setDecryptedPK] = useState<string>("");
  const [exportPKPassword, setExportPKPassword] = useState<string>("");

  const walletsRef = useRef(gameWallets);
  const automationSettingsRef = useRef(automationSettings);
  const verificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    walletsRef.current = gameWallets;
  }, [gameWallets]);

  useEffect(() => {
    automationSettingsRef.current = automationSettings;
  }, [automationSettings]);

  const checkStoredWallets = useCallback(() => {
    const stored = localStorage.getItem("qupaca_game_wallets");
    if (stored) {
      setShowPasswordModal(true);
    } else {
      setIsUnlocked(false);
    }
  }, []);

  useEffect(() => {
    checkStoredWallets();
    const storedTransactions = localStorage.getItem(
      "qupaca_transaction_history"
    );
    if (storedTransactions) {
      try {
        const parsed: TransactionRecord[] = JSON.parse(storedTransactions);
        const normalized = parsed.map((t) => ({
          ...t,
          verification: t.verification || ("pending" as const),
          verifying: false,
        }));
        setTransactionHistory(normalized);
      } catch (error) {
        console.error("Failed to load transaction history:", error);
      }
    }
  }, [checkStoredWallets]);

  const verifyHash = useCallback(async (hash: string) => {
    try {
      const res = await axios.post(JACKPOT_VERIFY_URL, {
        transactionHash: hash,
      });
      const isWinner = !!(
        res?.data?.won ||
        res?.data?.isWinner ||
        res?.data?.winner
      );
      const newVerification: TransactionRecord["verification"] = isWinner
        ? "won"
        : "no_jackpot";
      setTransactionHistory((prev) => {
        const updated: TransactionRecord[] = prev.map((t) =>
          t.hash === hash
            ? {
                ...t,
                verification: newVerification,
                verifying: false,
                lastVerificationAt: Date.now(),
              }
            : t
        );
        localStorage.setItem(
          "qupaca_transaction_history",
          JSON.stringify(updated)
        );
        return updated;
      });
    } catch (e) {
      setTransactionHistory((prev) => {
        const updated: TransactionRecord[] = prev.map((t) =>
          t.hash === hash
            ? { ...t, verifying: false, lastVerificationAt: Date.now() }
            : t
        );
        localStorage.setItem(
          "qupaca_transaction_history",
          JSON.stringify(updated)
        );
        return updated;
      });
    }
  }, []);

  const forceVerify = useCallback(
    async (hash: string) => {
      setTransactionHistory((prev) =>
        prev.map((t) => (t.hash === hash ? { ...t, verifying: true } : t))
      );
      await verifyHash(hash);
    },
    [verifyHash]
  );

  const startVerificationWorker = useCallback(() => {
    if (verificationTimerRef.current) return;
    verificationTimerRef.current = setInterval(async () => {
      try {
        const nextTx = transactionHistory.find(
          (t) => (t.verification || "pending") === "pending" && !t.verifying
        );
        if (!nextTx) return;
        if (!JACKPOT_VERIFY_URL) return;
        setTransactionHistory((prev) =>
          prev.map((t) =>
            t.hash === nextTx.hash ? { ...t, verifying: true } : t
          )
        );
        await verifyHash(nextTx.hash);
      } catch (e) {}
    }, 1000);
  }, [transactionHistory, verifyHash]);

  useEffect(() => {
    if (!verificationTimerRef.current) startVerificationWorker();
    return () => {};
  }, [startVerificationWorker]);

  const refreshBalances = useCallback(async () => {
    if (walletsRef.current.length > 0) {
      try {
        const updatedWallets = await Promise.all(
          walletsRef.current.map(async (wallet) => {
            const balance = await singletonProvider.getBalance(wallet.address);
            return { ...wallet, balance: balance.toString() };
          })
        );
        setGameWallets(updatedWallets);
      } catch (error) {
        console.error("Failed to refresh wallet balances:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      refreshBalances();
      const intervalId = setInterval(refreshBalances, 3000);
      return () => clearInterval(intervalId);
    }
  }, [isUnlocked, refreshBalances]);

  const encryptData = async (
    data: string,
    password: string
  ): Promise<string> => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = encoder.encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedData
    );

    const result = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength
    );
    result.set(salt);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...result));
  };

  const decryptData = async (
    encryptedData: string,
    password: string
  ): Promise<string> => {
    const data = new Uint8Array(
      atob(encryptedData)
        .split("")
        .map((char) => char.charCodeAt(0))
    );

    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encrypted = data.slice(28);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  };

  const handlePasswordSubmit = async () => {
    try {
      const stored = localStorage.getItem("qupaca_game_wallets");
      if (stored) {
        const decryptedData = await decryptData(stored, password);
        const wallets = JSON.parse(decryptedData);
        setGameWallets(wallets);
        setIsUnlocked(true);
        setShowPasswordModal(false);
        notification.success({ message: "Wallets unlocked successfully!" });
      } else {
        setGameWallets([]);
        setIsUnlocked(true);
        setShowPasswordModal(false);
        notification.success({
          message: "Password set! You can now create game wallets.",
        });
      }
    } catch (error) {
      notification.error({ message: "Invalid password!" });
    }
  };

  const saveWallets = async (wallets: GameWallet[]) => {
    if (!password) return;

    const encrypted = await encryptData(JSON.stringify(wallets), password);
    localStorage.setItem("qupaca_game_wallets", encrypted);
  };

  const createGameWallet = async () => {
    if (!newWalletName.trim()) {
      notification.error({ message: "Please enter a wallet name" });
      return;
    }

    try {
      const wallet = ethers.Wallet.createRandom();
      const encryptedPrivateKey = await encryptData(
        wallet.privateKey,
        password
      );

      const newWallet: GameWallet = {
        id: Date.now().toString(),
        name: newWalletName.trim(),
        address: wallet.address,
        encryptedPrivateKey,
        balance: "0",
        transactions: 0,
        totalSent: "0",
        totalGasFees: "0",
        createdAt: Date.now(),
      };

      const updatedWallets = [...gameWallets, newWallet];
      setGameWallets(updatedWallets);
      await saveWallets(updatedWallets);

      setNewWalletName("");
      setShowCreateModal(false);
      notification.success({
        message: `Game wallet "${newWallet.name}" created successfully!`,
      });
    } catch (error) {
      notification.error({ message: "Failed to create wallet" });
    }
  };

  const deleteWallet = async (walletId: string) => {
    const updatedWallets = gameWallets.filter((w) => w.id !== walletId);
    setGameWallets(updatedWallets);
    await saveWallets(updatedWallets);

    contractCache.delete(walletId);

    notification.success({ message: "Wallet deleted successfully!" });
  };

  const resetAllData = () => {
    localStorage.removeItem("qupaca_game_wallets");
    setGameWallets([]);
    setIsUnlocked(false);
    setPassword("");
    contractCache.clear();
    notification.success({ message: "All data reset successfully!" });
  };

  const sendFundsToGameWallet = async () => {
    if (!walletClient || !transferAmount || !selectedWallet) {
      notification.error({ message: "Please fill in all fields" });
      return;
    }

    setIsTransferring(true);
    try {
      const targetWallet = gameWallets.find((w) => w.id === selectedWallet);
      if (!targetWallet) throw new Error("Wallet not found");

      await walletClient.sendTransaction({
        to: targetWallet.address as `0x${string}`,
        value: ethers.parseEther(transferAmount.toString()),
      });

      notification.success({
        message: "Transfer successful!",
        description: `Sent ${transferAmount} RON to ${targetWallet.name}`,
      });

      setTransferAmount(0);
      setSelectedWallet("");
    } catch (error) {
      notification.error({
        message: "Transfer failed",
        description: (error as Error).message,
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notification.success({ message: "Copied to clipboard!" });
  };

  const handleExportPrivateKey = (wallet: GameWallet) => {
    setSelectedWalletForPK(wallet);
    setShowExportPKModal(true);
    setDecryptedPK("");
    setExportPKPassword("");
  };

  const handleDecryptPrivateKey = async () => {
    if (!selectedWalletForPK || !exportPKPassword) {
      notification.error({ message: "Password is required" });
      return;
    }
    try {
      const privateKey = await decryptData(
        selectedWalletForPK.encryptedPrivateKey,
        exportPKPassword
      );
      setDecryptedPK(privateKey);
    } catch (error) {
      notification.error({ message: "Invalid password!" });
      setDecryptedPK("");
    }
  };

  const handleCloseExportModal = () => {
    setShowExportPKModal(false);
    setSelectedWalletForPK(null);
    setDecryptedPK("");
    setExportPKPassword("");
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatEther = (wei: string | number) => {
    try {
      return parseFloat(ethers.formatEther(wei.toString())).toFixed(4);
    } catch {
      return "0.0000";
    }
  };

  const calculateRonCosts = (
    transactionsPerMinute: number,
    ethPerBet: number
  ) => {
    const costPerMinute = transactionsPerMinute * ethPerBet;
    const costPerHour = costPerMinute * 60;
    return {
      perMinute: costPerMinute.toFixed(4),
      perHour: costPerHour.toFixed(4),
    };
  };

  const getOrCreateContract = async (
    wallet: GameWallet
  ): Promise<ethers.Contract> => {
    const cacheKey = wallet.id;

    if (contractCache.has(cacheKey)) {
      return contractCache.get(cacheKey)!;
    }

    const privateKey = await decryptData(wallet.encryptedPrivateKey, password);
    const gameWallet = new ethers.Wallet(privateKey, singletonProvider);
    const contract = new ethers.Contract(SLOT_ADDRESS, SLOT_ABI, gameWallet);

    contractCache.set(cacheKey, contract);
    return contract;
  };

  const sendTransactionViaAxios = async (signedTx: string): Promise<string> => {
    try {
      console.log(`[DEBUG] Sending transaction via axios to: ${RPC_URL}`);
      console.log(`[DEBUG] Signed TX: ${signedTx.substring(0, 50)}...`);

      const response = await axios.post(RPC_URL, {
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [signedTx],
        id: Date.now(),
      });

      console.log(`[DEBUG] RPC Response:`, response.data);

      if (response.data.error) {
        console.error(`[DEBUG] RPC Error:`, response.data.error);
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw error;
    }
  };

  const executeTransaction = async (walletId: string) => {
    console.log(`[Automation] Attempting transaction for wallet ${walletId}`);

    const wallet = walletsRef.current.find((w) => w.id === walletId);
    if (!wallet) {
      console.error(`[Automation] Wallet ${walletId} not found`);
      return;
    }

    const settings = automationSettingsRef.current[walletId];
    if (!settings || !settings.isRunning) {
      console.log(
        `[Automation] Settings not found or automation stopped for wallet ${walletId}`
      );
      return;
    }

    console.log(
      `[Automation] Executing transaction for ${wallet.name} - ${settings.ethPerBet} RON on ${settings.targetGame}`
    );

    try {
      const contract = await getOrCreateContract(wallet);
      const amount = ethers.parseEther(settings.ethPerBet.toString());
      const timestamp = BigInt(Date.now());
      const randomBytes = crypto.getRandomValues(new Uint8Array(12));
      const randomHex = Array.from(randomBytes, (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");
      const gameId = (timestamp << 96n) | BigInt(`0x${randomHex}`);

      const totalValue = ethers.parseEther("0.012520408163265306");
      console.log(
        `[DEBUG] Bet amount: ${amount.toString()}, Quoted value for tx: ${totalValue.toString()}`
      );

      const privateKey = await decryptData(
        wallet.encryptedPrivateKey,
        password
      );
      const walletRunner = new ethers.Wallet(privateKey, singletonProvider);

      console.log(
        `[DEBUG] Wallet addresses - stored: ${wallet.address}, derived: ${walletRunner.address}`
      );
      console.log(
        `[DEBUG] Addresses match: ${
          wallet.address.toLowerCase() === walletRunner.address.toLowerCase()
        }`
      );

      const txData = contract.interface.encodeFunctionData("play", [
        walletRunner.address,
        "0x0000000000000000000000000000000000000000",
        amount,
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint8", "uint8", "uint8", "uint256", "uint256", "address"],
          [0, 1, 0, gameId, 0, "0x0000000000000000000000000000000000000000"]
        ),
      ]);

      const nonce = await singletonProvider.getTransactionCount(
        walletRunner.address,
        "pending"
      );
      const gasPrice = { gasPrice: 25n * 10n ** 9n };

      console.log(
        `[DEBUG] Transaction details - nonce: ${nonce}, gasPrice: ${gasPrice.gasPrice}, amount: ${amount}`
      );
      console.log(`[DEBUG] Contract address: ${SLOT_ADDRESS}`);

      const txRequest = {
        to: SLOT_ADDRESS,
        data: txData,
        value: totalValue,
        nonce: nonce,
        gasLimit: 800000n,
        gasPrice: gasPrice.gasPrice,
        chainId: 2020,
      };

      console.log(`[DEBUG] TX Request:`, txRequest);

      const signedTx = await walletRunner.signTransaction(txRequest);
      console.log(
        `[Automation] Transaction signed for ${wallet.name}, sending...`
      );
      console.log(
        `[DEBUG] Signed TX length: ${
          signedTx.length
        }, starts with 0x: ${signedTx.startsWith("0x")}`
      );

      const txHash = await sendTransactionViaAxios(signedTx);
      console.log(`[Automation] Transaction sent successfully: ${txHash}`);

      const txRecord: TransactionRecord = {
        hash: txHash,
        timestamp: Date.now(),
        amount: amount.toString(),
        walletId: wallet.id,
        walletName: wallet.name,
        game: settings.targetGame,
        status: "pending",
        verification: "pending",
        verifying: false,
      };

      setTransactionHistory((prev) => {
        const newHistory = [txRecord, ...prev].slice(0, 100);
        localStorage.setItem(
          "qupaca_transaction_history",
          JSON.stringify(newHistory)
        );
        return newHistory;
      });

      setGameWallets((prev) =>
        prev.map((w) =>
          w.id === wallet.id
            ? {
                ...w,
                transactions: w.transactions + 1,
                totalSent: (BigInt(w.totalSent) + BigInt(amount)).toString(),
              }
            : w
        )
      );

      notification.success({
        message: `Transaction sent from ${wallet.name}`,
        description: `Bet ${settings.ethPerBet} RON on ${
          settings.targetGame
        } - TX: ${txHash.slice(0, 10)}...`,
      });
    } catch (error) {
      console.error(`Failed to send transaction from ${wallet.name}:`, error);
      notification.error({
        message: `Transaction failed for ${wallet.name}`,
        description: (error as Error).message,
      });
    }
  };

  const toggleAutomation = (walletId: string) => {
    const wallet = gameWallets.find((w) => w.id === walletId);
    if (!wallet) return;

    const updatedSettings = { ...automationSettings };
    const isRunning = !updatedSettings[walletId]?.isRunning;

    console.log(
      `[Automation] Toggling automation for ${wallet.name} to ${
        isRunning ? "ON" : "OFF"
      }`
    );

    if (isRunning) {
      updatedSettings[walletId] = {
        ...updatedSettings[walletId],
        isRunning: true,
        transactionsPerMinute:
          updatedSettings[walletId]?.transactionsPerMinute || 10,
        ethPerBet: updatedSettings[walletId]?.ethPerBet || 0.012,
        targetGame: updatedSettings[walletId]?.targetGame || "slots",
      };

      const interval =
        60000 / (updatedSettings[walletId].transactionsPerMinute || 10);
      console.log(
        `[Automation] Setting interval every ${interval}ms (${updatedSettings[walletId].transactionsPerMinute} TX/min)`
      );

      const intervalId = setInterval(
        () => executeTransaction(walletId),
        interval
      );
      setAutomationIntervals((prev) => ({ ...prev, [walletId]: intervalId }));
    } else {
      if (automationIntervals[walletId]) {
        clearInterval(automationIntervals[walletId]);
        setAutomationIntervals((prev) => {
          const newState = { ...prev };
          delete newState[walletId];
          return newState;
        });
      }
      if (updatedSettings[walletId]) {
        updatedSettings[walletId].isRunning = false;
      }
    }
    setAutomationSettings(updatedSettings);
  };

  if (!isConnected) {
    return (
      <div className="wallets-container">
        <div className="connect-wallet-section">
          <WalletOutlined
            style={{ fontSize: "4rem", color: "#667eea", marginBottom: "20px" }}
          />
          <Title level={2} className="connect-title">
            Connect Your Wallet
          </Title>
          <Text className="connect-description">
            Connect your main wallet using RainbowKit to manage your game
            wallets and start automating your casino operations.
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="wallets-container">
      <div className="main-wallet-section">
        <div className="main-wallet-header">
          <div className="main-wallet-title">
            Main Wallet
          </div>
          <div className="wallet-address">{address}</div>
          <div className="eth-balance">
            {balance
              ? `${formatEther(balance.value.toString())} RON`
              : "0.0000 RON"}
          </div>
        </div>

        <div className="send-funds-section">
          <div className="send-funds-title">
            Send RON to Game Wallet
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Input
                placeholder="Amount (RON)"
                type="number"
                value={transferAmount || ""}
                onChange={(e) =>
                  setTransferAmount(parseFloat(e.target.value) || 0)
                }
                min={0}
                step={0.001}
              />
            </Col>
            <Col xs={24} md={10}>
              <Select
                placeholder="Select your wallet"
                value={selectedWallet === "" ? "" : selectedWallet}
                onChange={(value) =>
                  setSelectedWallet(value === "" ? "" : value)
                }
                style={{ width: "100%" }}
              >
                <Option value="" disabled>
                  Select your wallet
                </Option>
                {gameWallets.map((wallet) => (
                  <Option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({formatAddress(wallet.address)})
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={6}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={sendFundsToGameWallet}
                loading={isTransferring}
                disabled={!transferAmount || !selectedWallet}
                block
              >
                Send
              </Button>
            </Col>
          </Row>
        </div>
      </div>

      <div className="game-wallets-section">
        <div className="section-header">
          <Title level={2} className="section-title">
            Game Wallets
          </Title>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
              disabled={!isUnlocked}
            >
              Create Wallet
            </Button>
            <Popconfirm
              title="Reset All Data"
              description="This will permanently delete all game wallets and their data. This action cannot be undone."
              onConfirm={resetAllData}
              okText="Yes, Reset"
              cancelText="Cancel"
              okType="danger"
            >
              <Button danger icon={<ReloadOutlined />}>
                Reset Data
              </Button>
            </Popconfirm>
          </Space>
        </div>

        {!isUnlocked && (
          <Card className="password-prompt">
            <div style={{ textAlign: "center" }}>
              <Title level={3}>
                {localStorage.getItem("qupaca_game_wallets")
                  ? "Enter Password"
                  : "Set Your Password"}
              </Title>
              <Text>
                {localStorage.getItem("qupaca_game_wallets")
                  ? "Enter your password to unlock your game wallets"
                  : "Create a secure password to protect your game wallets"}
              </Text>
              <div style={{ margin: "20px 0" }}>
                <Input.Password
                  placeholder={
                    localStorage.getItem("qupaca_game_wallets")
                      ? "Enter password"
                      : "Create password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onPressEnter={handlePasswordSubmit}
                />
              </div>
              <Button
                type="primary"
                onClick={handlePasswordSubmit}
                disabled={!password.trim()}
              >
                {localStorage.getItem("qupaca_game_wallets")
                  ? "Unlock Wallets"
                  : "Set Password"}
              </Button>
            </div>
          </Card>
        )}

        {isUnlocked &&
          gameWallets.map((wallet) => {
            const walletTxs = transactionHistory.filter(
              (tx) => tx.walletId === wallet.id
            );
            const transactionsCount = walletTxs.length;
            const totalSentWei = walletTxs
              .reduce((acc, tx) => acc + BigInt(tx.amount), 0n)
              .toString();
            const gasFeesWei = "0";
            return (
              <div key={wallet.id} className="game-wallet-card">
                <div className="wallet-card-header">
                  <div>
                    <div className="wallet-name">{wallet.name}</div>
                    <div className="wallet-address-small">
                      {wallet.address}
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(wallet.address)}
                      />
                    </div>
                  </div>
                  <Space>
                    <Button
                      size="small"
                      icon={<ExportOutlined />}
                      onClick={() => handleExportPrivateKey(wallet)}
                    >
                      Export PK
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => deleteWallet(wallet.id)}
                    >
                      Delete
                    </Button>
                  </Space>
                </div>

                <div className="wallet-stats">
                  <div className="stat-item">
                    <div className="stat-label">Balance</div>
                    <div className="stat-value">
                      {formatEther(wallet.balance)} RON
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Transactions</div>
                    <div className="stat-value">{transactionsCount}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Total Sent</div>
                    <div className="stat-value">
                      {formatEther(totalSentWei)} RON
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Gas Fees</div>
                    <div className="stat-value">
                      {formatEther(gasFeesWei)} RON
                    </div>
                  </div>
                </div>

                <div className="automation-controls">
                  <div className="automation-title">Automation Settings</div>

                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={5}>
                      <div className="control-group">
                        <label className="control-label">Status</label>
                        <Switch
                          checked={
                            automationSettings[wallet.id]?.isRunning || false
                          }
                          onChange={() => toggleAutomation(wallet.id)}
                          checkedChildren="Running"
                          unCheckedChildren="Stopped"
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={5}>
                      <div className="control-group">
                        <label className="control-label">
                          TX/Minute:{" "}
                          {automationSettings[wallet.id]
                            ?.transactionsPerMinute || 10}
                        </label>
                        <Slider
                          min={1}
                          max={30}
                          value={
                            automationSettings[wallet.id]
                              ?.transactionsPerMinute || 10
                          }
                          onChange={(value) =>
                            setAutomationSettings((prev) => ({
                              ...prev,
                              [wallet.id]: {
                                ...prev[wallet.id],
                                transactionsPerMinute: value,
                              },
                            }))
                          }
                          marks={{
                            1: "1",
                            15: "15",
                            30: "30",
                          }}
                        />
                      </div>
                    </Col>
                    <Col xs={24} md={4}>
                      <div className="control-group">
                        <label className="control-label">Game</label>
                        <Select
                          value={
                            automationSettings[wallet.id]?.targetGame || "slots"
                          }
                          onChange={(value) =>
                            setAutomationSettings((prev) => ({
                              ...prev,
                              [wallet.id]: {
                                ...prev[wallet.id],
                                targetGame: value,
                              },
                            }))
                          }
                          style={{ width: "100%" }}
                        >
                          <Option value="slots">Slots</Option>
                          <Option value="roulette" disabled>Roulette</Option>
                          <Option value="plinko" disabled>Plinko</Option>
                        </Select>
                      </div>
                    </Col>
                    <Col xs={24} md={6}>
                      <div className="control-group">
                        <label className="control-label">
                          RON Cost (without fees)
                        </label>
                        <div style={{ fontSize: "0.9rem", color: "#666" }}>
                          <div>
                            Per minute:{" "}
                            {
                              calculateRonCosts(
                                automationSettings[wallet.id]
                                  ?.transactionsPerMinute || 10,
                                automationSettings[wallet.id]?.ethPerBet || 0.012
                              ).perMinute
                            }{" "}
                            RON
                          </div>
                          <div>
                            Per hour:{" "}
                            {
                              calculateRonCosts(
                                automationSettings[wallet.id]
                                  ?.transactionsPerMinute || 10,
                                automationSettings[wallet.id]?.ethPerBet || 0.012
                              ).perHour
                            }{" "}
                            RON
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {automationSettings[wallet.id]?.isRunning && (
                    <div className="loading-animation">
                      <span>
                        Automating {automationSettings[wallet.id]?.targetGame}{" "}
                        at{" "}
                        {automationSettings[wallet.id]?.transactionsPerMinute ||
                          10}{" "}
                        TX/min
                      </span>
                      <div className="pulse-dot"></div>
                      <div className="pulse-dot"></div>
                      <div className="pulse-dot"></div>
                    </div>
                  )}

                  {walletTxs.length > 0 && (
                    <div className="transaction-history">
                      <div className="transaction-history-title">
                        Recent Transactions
                      </div>
                      <div className="transaction-list">
                        {walletTxs.slice(0, 5).map((tx, index) => (
                          <div key={index} className="transaction-item">
                            <div className="transaction-hash">
                              <a
                                href={`https://app.roninchain.com/tx/${tx.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                              </a>
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => copyToClipboard(tx.hash)}
                              />
                            </div>
                            <div className="transaction-details">
                              <span className="transaction-amount">
                                {formatEther(tx.amount)} RON
                              </span>
                              <span className="transaction-game">
                                {tx.game}
                              </span>
                              <span className="transaction-time">
                                {new Date(tx.timestamp).toLocaleTimeString()}
                              </span>
                              <span className="transaction-status">
                                {tx.verifying
                                  ? "Checking..."
                                  : (tx.verification || "pending") === "pending"
                                  ? "Verification pending"
                                  : tx.verification === "won"
                                  ? "Won jackpot"
                                  : "No jackpot"}
                              </span>
                              <Button
                                size="small"
                                onClick={() => forceVerify(tx.hash)}
                                disabled={tx.verifying}
                                style={{ marginLeft: 8 }}
                              >
                                Force check
                              </Button>
                              {tx.lastVerificationAt ? (
                                <span
                                  className="transaction-last-check"
                                  style={{ marginLeft: 8 }}
                                >
                                  {new Date(
                                    tx.lastVerificationAt
                                  ).toLocaleTimeString()}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <Modal
        title={
          localStorage.getItem("qupaca_game_wallets")
            ? "Enter Password"
            : "Set Password"
        }
        open={showPasswordModal}
        onOk={handlePasswordSubmit}
        onCancel={() => setShowPasswordModal(false)}
        okText={
          localStorage.getItem("qupaca_game_wallets")
            ? "Unlock"
            : "Set Password"
        }
        cancelText="Cancel"
        centered
        className="password-modal"
      >
        <div className="password-warning">
          <strong>Important:</strong> If you forget this password, you will lose
          access to all your game wallets permanently.
        </div>
        <Input.Password
          placeholder={
            localStorage.getItem("qupaca_game_wallets")
              ? "Enter your password"
              : "Create a secure password"
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handlePasswordSubmit}
          autoFocus
        />
      </Modal>

      <Modal
        title="Create New Game Wallet"
        open={showCreateModal}
        onOk={createGameWallet}
        onCancel={() => setShowCreateModal(false)}
        okText="Create"
        cancelText="Cancel"
        centered
      >
        <Input
          placeholder="Enter wallet name"
          value={newWalletName}
          onChange={(e) => setNewWalletName(e.target.value)}
          onPressEnter={createGameWallet}
          autoFocus
        />
      </Modal>

      <Modal
        title="Export Private Key"
        open={showExportPKModal}
        onCancel={handleCloseExportModal}
        footer={null}
        centered
      >
        {decryptedPK ? (
          <div>
            <Title level={4}>Your Private Key</Title>
            <Text type="danger">
              Warning: Never share this key with anyone. Anyone with your
              private key can take full control of your wallet.
            </Text>
            <Input.TextArea
              value={decryptedPK}
              readOnly
              rows={3}
              style={{
                margin: "16px 0",
                fontFamily: "monospace",
                userSelect: "all",
              }}
            />
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(decryptedPK)}
              block
            >
              Copy to Clipboard
            </Button>
          </div>
        ) : (
          <div>
            <Title level={5}>
              Enter password for "{selectedWalletForPK?.name}"
            </Title>
            <Text>
              To export the private key, please enter the password you used to
              encrypt your wallets.
            </Text>
            <Input.Password
              placeholder="Enter your password"
              value={exportPKPassword}
              onChange={(e) => setExportPKPassword(e.target.value)}
              onPressEnter={handleDecryptPrivateKey}
              style={{ margin: "16px 0" }}
              autoFocus
            />
            <Button
              type="primary"
              onClick={handleDecryptPrivateKey}
              disabled={!exportPKPassword.trim()}
              block
            >
              Decrypt & Show Key
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WalletsPage;
