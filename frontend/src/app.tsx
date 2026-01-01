import { Component, PropsWithChildren } from 'react'
import Taro from '@tarojs/taro'
import './app.scss'

const API_BASE = 'http://localhost:8765'

class App extends Component<PropsWithChildren> {
  async componentDidMount () {
    console.log('App mounted')
    // 检查激活状态
    await this.checkActivation()
  }

  async checkActivation() {
    try {
      const res = await fetch(`${API_BASE}/api/license/status`)
      const result = await res.json()

      console.log('Activation status:', result)

      // 如果未激活，跳转到激活页面
      if (!result.activated) {
        console.log('Software not activated, redirecting to activation page...')
        // 延迟跳转，确保页面已加载
        setTimeout(() => {
          Taro.redirectTo({
            url: '/pages/activation/index',
            fail: (err) => {
              console.error('Failed to redirect to activation page:', err)
            }
          })
        }, 500)
      } else {
        console.log('Software activated, expire date:', result.expire_date)
      }
    } catch (err) {
      console.error('Failed to check activation:', err)
      // 如果后端未启动或连接失败，显示提示
      Taro.showToast({
        title: 'Unable to connect to backend service',
        icon: 'none',
        duration: 3000
      })
    }
  }

  componentDidShow () {}

  componentDidHide () {}

  render () {
    return this.props.children
  }
}

export default App
