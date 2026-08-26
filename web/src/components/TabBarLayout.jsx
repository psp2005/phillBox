import { SafeArea, TabBar } from 'antd-mobile'
import { BellIcon, DeviceIcon } from './icons.jsx'
import styles from './TabBarLayout.module.css'

/**
 * 하단 탭이 있는 화면(2, 7)을 감싸는 껍데기.
 * 화면 3·4·5·6 은 파고 들어가는 화면이라 이걸 쓰지 않는다.
 *
 * @param {'devices'|'notifications'} activeKey
 * @param {number} unreadCount  안 읽은 알림 수 (0 이면 배지 없음)
 * @param {(key: string) => void} onChange
 */
export default function TabBarLayout({
  activeKey,
  unreadCount = 0,
  onChange,
  children,
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.body}>{children}</div>

      <div className={styles.tabbar}>
        <TabBar activeKey={activeKey} onChange={onChange} safeArea={false}>
          <TabBar.Item key="devices" icon={<DeviceIcon />} title="기기" />
          <TabBar.Item
            key="notifications"
            icon={<BellIcon />}
            title="알림"
            badge={unreadCount > 0 ? String(unreadCount) : null}
          />
        </TabBar>
        <SafeArea position="bottom" />
      </div>
    </div>
  )
}
