// 字段映射和配置
export interface FieldConfig {
  key: string
  label: string
  width?: number
  fixed?: 'left' | 'right'
  group: string
  editable?: boolean
  required?: boolean
  type?: 'text' | 'date' | 'number' | 'select'
  options?: string[]
}

// 字段分组
export const fieldGroups = {
  basic: '基础信息',
  employment: '合同信息',
  education: '教育信息',
  qualification: '资格信息',
  contact: '联系方式',
  other: '其他信息',
}

// 所有字段配置
export const fieldConfigs: FieldConfig[] = [
  // 基础信息
  { key: 'teacher_code', label: '员工工号', width: 130, group: 'basic', editable: true, required: true },
  { key: 'name', label: '姓名', width: 110, group: 'basic', editable: true, required: true },
  { key: 'department', label: '部门', width: 120, group: 'basic', editable: true, type: 'select', options: ['小学部', '初中部', '高中部', '行政部'] },
  { key: 'position', label: '职务', width: 120, group: 'basic', editable: true },
  { key: 'gender', label: '性别', width: 80, group: 'basic', editable: true, type: 'select', options: ['男', '女'] },
  { key: 'age', label: '年龄', width: 80, group: 'basic', type: 'number' },
  { key: 'nation', label: '民族', width: 100, group: 'basic', editable: true },
  { key: 'political_status', label: '政治面貌', width: 120, group: 'basic', editable: true, type: 'select', options: ['中共党员', '共青团员', '民主党派', '群众'] },
  { key: 'id_number', label: '身份证号码', width: 180, group: 'basic', editable: true },
  { key: 'birthplace', label: '籍贯', width: 120, group: 'basic', editable: true },

  // 合同信息
  { key: 'entry_date', label: '入职日期', width: 120, group: 'employment', editable: true, type: 'date' },
  { key: 'regular_date', label: '转正日期', width: 120, group: 'employment', editable: true, type: 'date' },
  { key: 'contract_start', label: '合同开始日', width: 120, group: 'employment', editable: true, type: 'date' },
  { key: 'contract_end', label: '合同到期日', width: 120, group: 'employment', editable: true, type: 'date' },
  { key: 'job_status', label: '在职状态', width: 100, group: 'employment', editable: true, type: 'select', options: ['在职', '离职', '试用期'] },
  { key: 'resign_date', label: '离职日期', width: 120, group: 'employment', editable: true, type: 'date' },

  // 教育信息
  { key: 'education', label: '最高学历', width: 120, group: 'education', editable: true, type: 'select', options: ['博士', '硕士', '本科', '专科'] },
  { key: 'graduation_school', label: '毕业院校', width: 150, group: 'education', editable: true },
  { key: 'diploma_no', label: '毕业证号', width: 150, group: 'education', editable: true },
  { key: 'graduation_date', label: '毕业时间', width: 120, group: 'education', editable: true, type: 'date' },
  { key: 'major', label: '专业', width: 120, group: 'education', editable: true },
  { key: 'degree', label: '学位', width: 100, group: 'education', editable: true },
  { key: 'degree_no', label: '学位证号', width: 150, group: 'education', editable: true },

  // 资格信息
  { key: 'teacher_cert_type', label: '教师资格种类', width: 150, group: 'qualification', editable: true },
  { key: 'teacher_cert_no', label: '教师资格证号', width: 180, group: 'qualification', editable: true },
  { key: 'title_rank', label: '职称等级', width: 120, group: 'qualification', editable: true },
  { key: 'title_cert_no', label: '职称证号', width: 150, group: 'qualification', editable: true },
  { key: 'title_cert_date', label: '职称取证时间', width: 120, group: 'qualification', editable: true, type: 'date' },
  { key: 'psychology_cert', label: '心理证', width: 120, group: 'qualification', editable: true },
  { key: 'certificate_type', label: '持证类别', width: 120, group: 'qualification', editable: true },
  { key: 'mandarin_level', label: '普通话等级', width: 120, group: 'qualification', editable: true },

  // 工作信息
  { key: 'start_work_date', label: '参加工作时间', width: 120, group: 'employment', editable: true, type: 'date' },
  { key: 'teaching_years', label: '教龄', width: 80, group: 'employment', type: 'number' },
  { key: 'teaching_grade', label: '任教年级', width: 120, group: 'employment', editable: true },
  { key: 'teaching_subject', label: '任教学科', width: 120, group: 'employment', editable: true },
  { key: 'last_work', label: '上一份工作经历', width: 200, group: 'employment', editable: true },

  // 联系方式
  { key: 'phone_number', label: '电话号码', width: 130, group: 'contact', editable: true },
  { key: 'address', label: '家庭住址', width: 200, group: 'contact', editable: true },
  { key: 'emergency_contact', label: '紧急联系人', width: 120, group: 'contact', editable: true },
  { key: 'emergency_phone', label: '联系电话', width: 130, group: 'contact', editable: true },

  // 其他
  { key: 'remarks', label: '备注', width: 200, group: 'other', editable: true },
  { key: 'ocr_confidence', label: 'OCR置信度', width: 120, group: 'other' },
]

// 根据字段 key 获取配置
export const getFieldConfig = (key: string): FieldConfig | undefined => {
  return fieldConfigs.find(config => config.key === key)
}

// 获取某个分组的所有字段
export const getFieldsByGroup = (group: string): FieldConfig[] => {
  return fieldConfigs.filter(config => config.group === group)
}

// 敏感字段列表（需要加密）
export const sensitiveFields = ['id_number', 'phone_number', 'address', 'emergency_phone']

// 日期字段列表
export const dateFields = [
  'entry_date',
  'regular_date',
  'contract_start',
  'contract_end',
  'resign_date',
  'graduation_date',
  'title_cert_date',
  'start_work_date',
]

// 必填字段
export const requiredFields = fieldConfigs
  .filter(config => config.required)
  .map(config => config.key)

