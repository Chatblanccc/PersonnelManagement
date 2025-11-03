import { useEffect, useMemo, useRef } from 'react'
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Row,
  Col,
  Divider,
  Space,
} from 'antd'
import dayjs, { Dayjs } from 'dayjs'

import { useCreateContract } from '@/hooks/useContracts'
import type { Contract } from '@/types/contract'

interface AddTeacherModalProps {
  open: boolean
  onClose: () => void
}

type DateKeys =
  | 'entry_date'
  | 'regular_date'
  | 'contract_start'
  | 'contract_end'
  | 'resign_date'
  | 'graduation_date'
  | 'title_cert_date'
  | 'start_work_date'

type BaseFormValues = Partial<Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'file_url' | 'ocr_confidence'>>

type AddTeacherFormValues = Omit<BaseFormValues, DateKeys> & {
  [key in DateKeys]?: Dayjs | string | null
}

const selectOptions = {
  department: ['小学部', '初中部', '高中部', '行政部'],
  gender: ['男', '女'],
  jobStatus: ['在职', '试用期', '离职'],
  education: ['博士', '硕士', '本科', '专科'],
  political: ['中共党员', '共青团员', '民主党派', '群众'],
} as const

const AddTeacherModal = ({ open, onClose }: AddTeacherModalProps) => {
  const [form] = Form.useForm<Partial<AddTeacherFormValues>>()
  const createContract = useCreateContract()
  const startWorkDateValue = Form.useWatch<Dayjs | string | null>('start_work_date', form)
  const teachingYearsTouchedRef = useRef(false)

  const optionMap = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(selectOptions).map(([key, values]) => [
          key,
          values.map((item) => ({ label: item, value: item })),
        ])
      ) as Record<keyof typeof selectOptions, { label: string; value: string }[]>,
    []
  )

  useEffect(() => {
    if (open) {
      form.resetFields()
      teachingYearsTouchedRef.current = false
      form.setFieldsValue({
        job_status: '在职',
        entry_date: dayjs(),
        contract_start: dayjs(),
        contract_end: dayjs().add(3, 'year'),
      })
    }
  }, [open, form])

  const handleTeachingYearsChange = (value: number | null) => {
    teachingYearsTouchedRef.current = true
    form.setFieldsValue({ teaching_years: value ?? undefined })
  }

  useEffect(() => {
    if (startWorkDateValue) {
      const start = dayjs(startWorkDateValue)
      if (start.isValid() && !teachingYearsTouchedRef.current) {
        form.setFieldsValue({ teaching_years: dayjs().diff(start, 'year') })
      }
    }
  }, [startWorkDateValue, form])

  const dateFields: DateKeys[] = useMemo(
    () => [
      'entry_date',
      'regular_date',
      'contract_start',
      'contract_end',
      'resign_date',
      'graduation_date',
      'title_cert_date',
      'start_work_date',
    ],
    []
  )

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const toDateString = (value?: Dayjs | string | null) =>
        value ? (dayjs.isDayjs(value) ? value.format('YYYY-MM-DD') : value) : undefined

      const payload: Partial<Contract> = {}

      Object.entries(values).forEach(([key, value]) => {
        if (dateFields.includes(key as DateKeys)) {
          (payload as Record<string, unknown>)[key] = toDateString(value as Dayjs | string | null)
        } else {
          (payload as Record<string, unknown>)[key] = value
        }
      })

      if (payload.start_work_date) {
        const start = dayjs(payload.start_work_date as string)
        if (start.isValid()) {
          payload.teaching_years = payload.teaching_years ?? dayjs().diff(start, 'year')
        }
      }

      await createContract.mutateAsync({ data: payload })
      form.resetFields()
      onClose()
    } catch (error) {
      if (error instanceof Error) {
        console.error(error)
      }
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      afterClose={() => {
        form.resetFields()
        teachingYearsTouchedRef.current = false
      }}
      onOk={handleSubmit}
      okText="确认入职"
      cancelText="取消"
      title="新增教师入职"
      centered
      width={960}
      destroyOnHidden
      maskClosable={false}
      confirmLoading={createContract.isPending}
      style={{ margin: 30 }}
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Space direction="vertical" size="large" className="w-full">
          <div>
            <Divider orientation="left">基础信息</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="teacher_code" label="员工工号" rules={[{ required: true, message: '请输入员工工号' }]}>
                  <Input placeholder="请输入员工工号" allowClear />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                  <Input placeholder="请输入姓名" allowClear />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="gender" label="性别">
                  <Select options={optionMap.gender} allowClear />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="age" label="年龄">
                  <InputNumber min={18} className="w-full" placeholder="请输入年龄" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="nation" label="民族">
                  <Input allowClear placeholder="请输入民族" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="political_status" label="政治面貌">
                  <Select options={optionMap.political} allowClear />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="id_number" label="身份证号码">
                  <Input allowClear placeholder="请输入身份证号" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="birthplace" label="籍贯">
                  <Input allowClear placeholder="请输入籍贯" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div>
            <Divider orientation="left">合同信息</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="department" label="部门">
                  <Select options={optionMap.department} allowClear />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="position" label="职务">
                  <Input allowClear placeholder="如：语文教师" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="job_status" label="在职状态" rules={[{ required: true, message: '请选择在职状态' }]}>
                  <Select options={optionMap.jobStatus} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="entry_date" label="入职日期">
                  <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="regular_date" label="转正日期">
                  <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="contract_start" label="合同开始日" rules={[{ required: true, message: '请选择合同开始日' }]}>
                  <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="contract_end" label="合同到期日" rules={[{ required: true, message: '请选择合同到期日' }]}>
                  <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="resign_date" label="离职日期">
                  <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="start_work_date" label="参加工作时间">
                  <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="teaching_grade" label="任教年级">
                  <Input allowClear placeholder="如：七年级" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="teaching_subject" label="任教学科">
                  <Input allowClear placeholder="如：语文" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div>
            <Divider orientation="left">教育背景</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="education" label="最高学历">
                  <Select options={optionMap.education} allowClear />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="graduation_school" label="毕业院校">
                  <Input allowClear placeholder="请输入毕业院校" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="graduation_date" label="毕业时间">
                  <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="diploma_no" label="毕业证号">
                  <Input allowClear placeholder="请输入毕业证号" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="major" label="专业">
                  <Input allowClear placeholder="请输入专业" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="degree" label="学位">
                  <Input allowClear placeholder="请输入学位" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="degree_no" label="学位证号">
                  <Input allowClear placeholder="请输入学位证号" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="last_work" label="上一份工作经历">
                  <Input allowClear placeholder="请输入上一份工作经历" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="teaching_years" label="教龄" tooltip="若填写参加工作时间会自动计算">
                  <InputNumber
                    min={0}
                    className="w-full"
                    placeholder="请输入教龄"
                    onChange={handleTeachingYearsChange}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div>
            <Divider orientation="left">资格证书</Divider>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="teacher_cert_type" label="教师资格种类">
                  <Input allowClear placeholder="如：高级中学教师资格" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="teacher_cert_no" label="教师资格证号">
                  <Input allowClear placeholder="请输入教师资格证号" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="title_rank" label="职称等级">
                  <Input allowClear placeholder="如：中级职称" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="title_cert_no" label="职称证号">
                  <Input allowClear placeholder="请输入职称证号" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="title_cert_date" label="职称取证时间">
                  <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="psychology_cert" label="心理证">
                  <Input allowClear placeholder="请输入心理证情况" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="certificate_type" label="持证类别">
                  <Input allowClear placeholder="请输入持证类别" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="mandarin_level" label="普通话等级">
                  <Input allowClear placeholder="请输入普通话等级" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div>
            <Divider orientation="left">联系方式</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="phone_number" label="电话号码">
                  <Input allowClear placeholder="请输入手机号" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="emergency_contact" label="紧急联系人">
                  <Input allowClear placeholder="请输入紧急联系人" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="emergency_phone" label="紧急联系电话">
                  <Input allowClear placeholder="请输入紧急联系电话" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="address" label="家庭住址">
                  <Input allowClear placeholder="请输入家庭住址" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div>
            <Divider orientation="left">备注</Divider>
            <Form.Item name="remarks">
              <Input.TextArea rows={4} placeholder="可填写补充说明、入职备注等" allowClear />
            </Form.Item>
          </div>
        </Space>
      </Form>
    </Modal>
  )
}

export default AddTeacherModal
export { AddTeacherModal }


