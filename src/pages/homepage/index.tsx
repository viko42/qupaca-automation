import { Watermark, Row, Col, Button } from 'antd';
import { 
  WalletOutlined, 
  BarChartOutlined, 
  SendOutlined, 
  DollarCircleOutlined, 
  SafetyOutlined,
  RobotOutlined,
  EyeOutlined
} from '@ant-design/icons';
import './index.css';
import { useNavigate } from 'react-router';

const HomePage = () => {
    const navigate = useNavigate();
    return (
        <Watermark content="moa.ron">
            <div>
                <section className="hero-section">
                    <h1 className="hero-title">Qupaca Casino Automation</h1>
                    <p className="hero-subtitle">
                        Automate your casino operations with unlimited wallets, volume tracking, and smart fund management
                    </p>
                    <div className="security-badge">
                        <SafetyOutlined className="security-icon" />
                        Secure • Private • Ronin RPC Only
                    </div>
                </section>

                <section className="feature-grid">
                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={12} lg={8}>
                            <div className="feature-card">
                                <RobotOutlined className="feature-icon" />
                                <h3 className="feature-title">Casino Automation</h3>
                                <p className="feature-description">
                                    Fully automate your Qupaca casino operations with intelligent algorithms and real-time decision making
                                </p>
                            </div>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <div className="feature-card">
                                <WalletOutlined className="feature-icon" />
                                <h3 className="feature-title">Unlimited Wallets</h3>
                                <p className="feature-description">
                                    Play with unlimited number of wallets simultaneously for maximum coverage and opportunity
                                </p>
                            </div>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <div className="feature-card">
                                <BarChartOutlined className="feature-icon" />
                                <h3 className="feature-title">Volume Tracking</h3>
                                <p className="feature-description">
                                    Monitor and track the volume of transactions for each wallet with detailed analytics
                                </p>
                            </div>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <div className="feature-card">
                                <EyeOutlined className="feature-icon" />
                                <h3 className="feature-title">Win/Loss Tracking</h3>
                                <p className="feature-description">
                                    Keep detailed records of wins and losses for each wallet to optimize your strategy
                                </p>
                            </div>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <div className="feature-card">
                                <SendOutlined className="feature-icon" />
                                <h3 className="feature-title">Smart Fund Scattering</h3>
                                <p className="feature-description">
                                    Intelligently distribute funds to all or selected wallets based on your preferences
                                </p>
                            </div>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <div className="feature-card">
                                <DollarCircleOutlined className="feature-icon" />
                                <h3 className="feature-title">Earnings Management</h3>
                                <p className="feature-description">
                                    Automatically claim funds and earnings from each wallet with optimized timing
                                </p>
                            </div>
                        </Col>
                    </Row>
                </section>

                <section className="wallet-management-section" onClick={() => {
                    navigate("/wallets")
                }}>
                    <div>
                        <h2 className="wallet-management-title">Manage Your Wallets</h2>
                        <p className="wallet-management-subtitle">
                            Central hub for all your wallet operations, monitoring, and automation settings
                        </p>
                        <Button className="cta-button" size="large">
                            Get Started Now
                        </Button>
                    </div>
                </section>

                <section className="benefits-section">
                    <h2 className="benefits-title">Why Choose Qupaca Automation?</h2>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <div className="benefit-item">
                                <p className="benefit-text">
                                    <strong>No Third-Party Dependencies:</strong> Direct connection to Ronin RPC only - your data stays private
                                </p>
                            </div>
                        </Col>
                        <Col xs={24} md={12}>
                            <div className="benefit-item">
                                <p className="benefit-text">
                                    <strong>Completely Free:</strong> Full access to all features without any subscription or hidden fees
                                </p>
                            </div>
                        </Col>
                        <Col xs={24} md={12}>
                            <div className="benefit-item">
                                <p className="benefit-text">
                                    <strong>Unlimited Scaling:</strong> Add as many wallets as you need without performance impact
                                </p>
                            </div>
                        </Col>
                        <Col xs={24} md={12}>
                            <div className="benefit-item">
                                <p className="benefit-text">
                                    <strong>Real-Time Analytics:</strong> Live tracking of all wallet activities and performance metrics
                                </p>
                            </div>
                        </Col>
                    </Row>
                </section>
            </div>
        </Watermark>
    )
    };

    export default HomePage;