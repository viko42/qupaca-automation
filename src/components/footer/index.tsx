import React from 'react'
import { Layout } from 'antd'
import './index.css'

const { Footer: AntFooter } = Layout

const Footer: React.FC = () => {
  return (
    <AntFooter className="moa-footer">
      <div className="moa-footer__content">
        <div className="moa-footer__left">© 2025 MOA</div>
        <div className="moa-footer__right"></div>
      </div>
    </AntFooter>
  )
}

export default Footer


