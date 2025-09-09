import React, { useState } from "react";
import { Layout, Menu, Button, Drawer } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { MenuProps } from "antd";
import "./index.css";

const { Header: AntHeader } = Layout;

const MenuItemWithBadge = ({
  to,
  children,
  badge,
}: {
  to: string;
  children: string;
  badge?: "soon" | "new";
}) => (
  <div className="menu-item-wrapper">
    <Link to={to} className={badge === "soon" ? "disabled-link" : ""}>
      {children}
    </Link>
    {badge === "soon" && <div className="badge badge--soon">Soon</div>}
    {badge === "new" && <div className="badge badge--new">New</div>}
  </div>
);

const items: MenuProps["items"] = [
  {
    key: "/",
    label: <MenuItemWithBadge to="/">Home</MenuItemWithBadge>,
  },
  {
    key: "/wallets",
    label: (
      <MenuItemWithBadge to="/wallets" badge="new">
        Wallets
      </MenuItemWithBadge>
    ),
  },
];

const Header: React.FC = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const location = useLocation();

  return (
    <AntHeader className="moa-header">
      <div className="moa-header__brand">
        <Link to="/">QUPACA</Link>
      </div>

      <Menu
        theme="light"
        mode="horizontal"
        items={items}
        className="moa-header__menu moa-header__menu--desktop"
        selectedKeys={[location.pathname]}
      />

      <div className="moa-header__actions">
        <ConnectButton />
        <Button
          className="moa-header__burger"
          type="text"
          icon={<MenuOutlined />}
          onClick={() => setDrawerVisible(true)}
        />
      </div>

      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="moa-header__drawer"
      >
        <Menu
          mode="vertical"
          items={items}
          selectedKeys={[location.pathname]}
          onClick={() => setDrawerVisible(false)}
        />
        <div
          style={{
            padding: "20px",
            borderTop: "1px solid #f0f0f0",
            marginTop: "20px",
          }}
        >
          <ConnectButton />
        </div>
      </Drawer>
    </AntHeader>
  );
};

export default Header;
