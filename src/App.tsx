import '@ant-design/v5-patch-for-react-19';

import { Layout, theme, Flex } from 'antd';
import { Routes, Route } from 'react-router-dom';
import Header from './components/header';
import Footer from './components/footer';
import HomePage from './pages/homepage';
import WalletsPage from './pages/wallets';

const { Content } = Layout;

const App = () => {
  const { token } = theme.useToken();
  
  const layoutStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: token.colorBgBase,
  };

  const contentStyle: React.CSSProperties = {
    paddingInline: 24,
    paddingBlock: 24,
    paddingTop: 88,
    minHeight: 'calc(100vh - 200px)',
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
    width: '100%',
  };

  return (
    <Layout style={layoutStyle}>
      <Header />
      <Content style={contentStyle}>
        <Flex justify="center" style={{ width: '100%' }}>
          <div style={containerStyle}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/wallets" element={<WalletsPage />} />
            </Routes>
          </div>
        </Flex>
      </Content>
      <Footer />
    </Layout>
  );
};

export default App;