import {
  ShopOutlined, CheckSquareOutlined, TeamOutlined, DollarOutlined,
  ApartmentOutlined, InboxOutlined, UnorderedListOutlined, AppstoreOutlined,
  UserAddOutlined, DesktopOutlined, ThunderboltOutlined, UserOutlined,
  CreditCardOutlined, BankOutlined, SendOutlined, MessageOutlined,
  FileTextOutlined, WifiOutlined, CloudServerOutlined, CommentOutlined,
  LineChartOutlined, WarningOutlined, FundOutlined, AccountBookOutlined,
  BarChartOutlined, SafetyOutlined, AuditOutlined, ProfileOutlined,
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
    label: '接单中心',
    icon: ShopOutlined,
    roles: ['业务员', '商务', '管理员'],
    items: [
      { id: 'fba-orders', label: '创建任务', icon: InboxOutlined },
      { id: 'my-orders', label: '接单管理', icon: UnorderedListOutlined },
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
      { id: 'grab-hall', label: '抢单大厅', icon: ThunderboltOutlined },
      { id: 'sub-order-detail', label: '订单列表', icon: ProfileOutlined },
    ],
  },
  {
    id: 'buyer-center',
    label: '买手管理',
    icon: TeamOutlined,
    roles: ['业务员', '管理员'],
    items: [
      { id: 'buyers', label: '买手库', icon: TeamOutlined },
      { id: 'buyer-check', label: '买手校验', icon: AuditOutlined },
      { id: 'buyer-profit', label: '买手盈亏分析', icon: FundOutlined },
    ],
  },
  {
    id: 'people',
    label: '业务管理',
    icon: UserOutlined,
    roles: ['业务员', '管理员'],
    items: [
      { id: 'staff-workbench', label: '业务员工作台', icon: DesktopOutlined },
      { id: 'staff', label: '业务员管理', icon: UserOutlined },
      { id: 'staff-analytics', label: '业务员数据分析', icon: BarChartOutlined },
      { id: 'after-sale', label: '售后问题单', icon: WarningOutlined },
    ],
  },
  {
    id: 'finance',
    label: '财务管理',
    icon: DollarOutlined,
    roles: ['财务', '管理员'],
    items: [
      { id: 'gift-cards', label: '礼品卡管理', icon: CreditCardOutlined },
      { id: 'paypal', label: 'PayPal', icon: BankOutlined },
      { id: 'refund-queue', label: '退款审批', icon: SendOutlined },
      { id: 'refund-ledger', label: '退款账单', icon: FileTextOutlined },
      { id: 'financial-ledger', label: '交易流水', icon: AccountBookOutlined },
      { id: 'profit-analysis', label: '利润分析', icon: LineChartOutlined },
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
  {
    id: 'assets',
    label: '资产管理',
    icon: CloudServerOutlined,
    roles: ['管理员'],
    items: [
      { id: 'chat-accounts', label: '聊单号管理', icon: CommentOutlined },
      { id: 'ip-resources', label: '行政资源管理', icon: WifiOutlined },
    ],
  },
  {
    id: 'system',
    label: '系统管理',
    icon: SafetyOutlined,
    roles: ['管理员'],
    items: [
      { id: 'user-management', label: '用户与权限', icon: SafetyOutlined },
    ],
  },
]

export function getNavGroupsForRole(role: StaffRole | null): NavGroup[] {
  if (!role) return []
  return allNavGroups.filter(g => g.roles.includes(role))
}
