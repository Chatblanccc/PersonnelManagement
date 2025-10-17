import dayjs from 'dayjs'

// 格式化日期为 YYYY-MM-DD
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return ''
  return dayjs(date).format('YYYY-MM-DD')
}

// 计算教龄（从参加工作时间到现在）
export const calculateTeachingYears = (startWorkDate: string | Date | null | undefined): number => {
  if (!startWorkDate) return 0
  const start = dayjs(startWorkDate)
  const now = dayjs()
  return now.diff(start, 'year')
}

// 判断日期是否有效
export const isValidDate = (date: string | Date | null | undefined): boolean => {
  if (!date) return false
  return dayjs(date).isValid()
}

// 计算年龄（从身份证号码）
export const calculateAgeFromIdNumber = (idNumber: string): number => {
  if (!idNumber || idNumber.length !== 18) return 0
  const birthYear = parseInt(idNumber.substring(6, 10))
  const birthMonth = parseInt(idNumber.substring(10, 12))
  const birthDay = parseInt(idNumber.substring(12, 14))
  const birthday = dayjs(`${birthYear}-${birthMonth}-${birthDay}`)
  return dayjs().diff(birthday, 'year')
}

