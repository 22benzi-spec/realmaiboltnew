import {
  ShopOutlined, CheckSquareOutlined, TeamOutlined, DollarOutlined,
  ApartmentOutlined, InboxOutlined, UnorderedListOutlined, AppstoreOutlined,
  UserAddOutlined, DesktopOutlined, ThunderboltOutlined, UserOutlined,
  StopOutlined, CreditCardOutlined, BankOutlined, SendOutlined, MessageOutlined,
} from '@ant-design/icons-vue'
import type { StaffRole } from '../types'

export interface NavItem {
  id: string
  label: string
  icon: unknown
}

export interface NavGroup {
  id: string
  label: string
  icon: unknown
  items: NavItem[]
  roles: StaffRole[]
}

const ALL_ROLES: StaffRole[] = ['业务员', '商务', '财务', '管理员']

export const allNavGroups: NavGroup[] = [
  {
    id: 'order-center',
    label: '订单中心',
    icon: ShopOutlined,
    roles: ['商务', '管理员'],
    items: [
      { id: 'fba-orders', label: '创建订单', icon: InboxOutlined },
      { id: 'my-orders', label: '订单列表', icon: UnorderedListOutlined },
    ],
  },
  {
    id: 'task-center',
    label: '任务中心',
    icon: CheckSquareOutlined,
    roles: ALL_ROLES,
    items: [
      { id: 'task-management', label: '任务管理', icon: AppstoreOutlined },
      { id: 'assignment', label: '分配管理', icon: UserAddOutlined },
      { id: 'staff-workbench', label: '业务员工作台', icon: DesktopOutlined },
      { id: 'grab-hall', label: '抢单大厅', icon: ThunderboltOutlined },
    ],
  },
  {
    id: 'people',
    label: '人员管理',
    icon: TeamOutlined,
    roles: ['业务员', '管理员'],
    items: [
      { id: 'staff', label: '业务员管理', icon: UserOutlined },
      { id: 'buyers', label: '买手库', icon: TeamOutlined },
      { id: 'blacklist', label: '买手黑名单', icon: StopOutlined },
    ],
  },
  {
    id: 'finance',
    label: '财务管理',
    icon: DollarOutlined,
    roles: ['财务', '管理员'],
    items: [
      { id: 'gift-cards', label: '礼品卡管理', icon: CreditCardOutlined },
      { id: 'paypal', label: 'PayPal / 美金库', icon: BankOutlined },
      { id: 'refund-queue', label: '退款审批', icon: SendOutlined },
    ],
  },
  {
    id: 'crm',
    label: '客户管理',
    icon: ApartmentOutlined,
    roles: ['商务', '管理员'],
    items: [
      { id: 'clients', label: '客户库', icon: ApartmentOutlined },
      { id: 'business', label: '商务管理', icon: MessageOutlined },
    ],
  },
]

export function getNavGroupsForRole(role: StaffRole | null): NavGroup[] {
  if (!role) return []
  return allNavGroups.filter(g => g.roles.includes(role))
}
