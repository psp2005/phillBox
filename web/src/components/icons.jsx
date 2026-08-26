/**
 * 하단 탭에 쓰는 아이콘.
 *
 * 아이콘 패키지를 따로 설치하지 않고 SVG 를 직접 그린다.
 * fill 을 currentColor 로 두면 CSS 의 글자색을 그대로 따라가므로,
 * 선택된 탭(파랑) / 안 선택된 탭(회색)을 antd-mobile 이 알아서 칠해준다.
 */

export function DeviceIcon(props) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h12V4H6zm3 3h6v2H9V7zm0 5h6v2H9v-2zm0 5h6v2H9v-2z" />
    </svg>
  )
}

export function BellIcon(props) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-1.7 1.7A1 1 0 0 0 5 19h14a1 1 0 0 0 .7-1.7L18 16z" />
    </svg>
  )
}

export function ChevronRightIcon(props) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.42 1.41l4.59-4.58a1 1 0 0 0 0-1.42L10.7 6.71a1 1 0 0 0-1.41 0z" />
    </svg>
  )
}
