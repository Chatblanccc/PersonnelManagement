import re
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from dateutil import parser as date_parser

class FieldParser:
    """字段解析器：从 OCR 文本中提取结构化字段"""
    
    def __init__(self, text_lines: list):
        """
        初始化解析器
        text_lines: [(text, confidence), ...]
        """
        self.text_lines = text_lines
        self.full_text = '\n'.join([text for text, _ in text_lines])
        self.confidence_map = {text: conf for text, conf in text_lines}
    
    def extract_field(
        self,
        patterns: list[str],
        default: Optional[str] = None,
        flags: int = re.IGNORECASE,
    ) -> Tuple[Optional[str], float]:
        """
        根据正则表达式列表提取字段
        返回：(值, 置信度)
        """
        for pattern in patterns:
            match = re.search(pattern, self.full_text, flags)
            if match:
                value = match.group(1).strip()
                # 查找对应的置信度
                confidence = self._find_confidence(value)
                return value, confidence
        return default, 0.0
    
    def _find_confidence(self, value: str) -> float:
        """查找文本对应的置信度"""
        for text, conf in self.text_lines:
            if value in text:
                return conf
        return 0.0
    
    def parse_date(self, date_str: str) -> Optional[str]:
        """解析日期字符串，返回标准格式 YYYY-MM-DD"""
        if not date_str:
            return None
        
        try:
            # 尝试多种日期格式
            date_formats = [
                r'(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})',
                r'(\d{4})\.(\d{1,2})\.(\d{1,2})',
            ]
            
            for fmt in date_formats:
                match = re.search(fmt, date_str)
                if match:
                    year, month, day = match.groups()
                    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            
            # 使用 dateutil 解析
            parsed_date = date_parser.parse(date_str, fuzzy=True)
            return parsed_date.strftime('%Y-%m-%d')
        except:
            return None
    
    def extract_all_fields(self) -> Tuple[Dict[str, Any], Dict[str, float]]:
        """
        提取所有字段
        返回：(字段字典, 置信度字典)
        """
        fields: Dict[str, Any] = {}
        confidence: Dict[str, float] = {}

        def set_field(key: str, value: Optional[Any], conf: float) -> None:
            if value in (None, "", []):
                return
            fields[key] = value
            if conf is not None:
                confidence[key] = conf
        
        # 辅助函数：在列表中查找字段值（支持表格形式）
        def find_value_after_label(label_patterns: list[str]) -> Tuple[Optional[str], float]:
            """
            在 text_lines 中查找标签后的值
            适用于表格形式：标签和值在相邻行
            """
            for pattern in label_patterns:
                for i, (text, conf) in enumerate(self.text_lines):
                    if re.search(pattern, text, re.IGNORECASE):
                        # 找到了标签，检查下一行是否是值
                        if i + 1 < len(self.text_lines):
                            next_text, next_conf = self.text_lines[i + 1]
                            # 过滤掉"分类"、"字段"、"数据示例"这类表头
                            if next_text.strip() and next_text not in ['分类', '字段', '数据示例', '基础信息', '入职信息', '教育背景', '资格证书', '工作信息', '其他']:
                                return next_text.strip(), next_conf
            # 如果表格形式没找到，尝试冒号格式
            return self.extract_field(label_patterns)
        
        # 员工工号
        value, conf = find_value_after_label([r'员工工号', r'工号', r'员工编号'])
        set_field('teacher_code', value, conf)
        
        # 姓名
        value, conf = find_value_after_label([r'姓名'])
        set_field('name', value, conf)
        
        # 性别
        value, conf = find_value_after_label([r'性别'])
        set_field('gender', value, conf)
        
        # 年龄
        value, conf = find_value_after_label([r'年龄'])
        if value and value.isdigit():
            set_field('age', int(value), conf)
        
        # 民族
        value, conf = find_value_after_label([r'民族'])
        set_field('nation', value, conf)
        
        # 身份证号
        value, conf = find_value_after_label([r'身份证号码', r'身份证号', r'证件号码'])
        if value:
            set_field('id_number', value, conf)
            # 如果没有年龄但有身份证号，尝试从身份证号计算
            if 'age' not in fields:
                calculated_age = self._calculate_age_from_id(value)
                if calculated_age:
                    set_field('age', calculated_age, conf or 0.9)
        
        # 籍贯
        value, conf = find_value_after_label([r'籍贯'])
        set_field('birthplace', value, conf)
        
        # 政治面貌
        value, conf = find_value_after_label([r'政治面貌', r'党派'])
        set_field('political_status', value, conf)
        
        # 部门
        value, conf = find_value_after_label([r'部门', r'所在部门'])
        set_field('department', value, conf)
        
        # 职务
        value, conf = find_value_after_label([r'职务', r'岗位'])
        set_field('position', value, conf)
        
        # 入职日期
        value, conf = find_value_after_label([r'入职日期', r'入职时间'])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                set_field('entry_date', parsed_date, conf)

        # 转正日期
        value, conf = find_value_after_label([r'转正日期', r'转正时间'])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                set_field('regular_date', parsed_date, conf)
        
        # 合同开始日期
        value, conf = find_value_after_label([r'合同开始日', r'合同起始日期', r'合同生效日期'])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                set_field('contract_start', parsed_date, conf)
        
        # 合同结束日期
        value, conf = find_value_after_label([r'合同到期日', r'合同终止日期', r'合同结束日'])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                set_field('contract_end', parsed_date, conf)

        # 在职状态
        value, conf = find_value_after_label([r'在职状态', r'工作状态'])
        set_field('job_status', value, conf)

        # 离职日期
        value, conf = find_value_after_label([r'离职日期', r'离职时间'])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                set_field('resign_date', parsed_date, conf)
        
        # 电话号码
        value, conf = find_value_after_label([r'电话号码', r'手机号码', r'联系电话'])
        set_field('phone_number', value, conf)
        
        # 最高学历
        value, conf = find_value_after_label([r'最高学历', r'学历'])
        set_field('education', value, conf)
        
        # 毕业院校
        value, conf = find_value_after_label([r'毕业院校', r'毕业学校'])
        set_field('graduation_school', value, conf)
        
        # 专业
        value, conf = find_value_after_label([r'专业', r'所学专业'])
        set_field('major', value, conf)
        
        # 学位
        value, conf = find_value_after_label([r'学位'])
        set_field('degree', value, conf)
        
        # 毕业时间
        value, conf = find_value_after_label([r'毕业时间', r'毕业日期'])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                set_field('graduation_date', parsed_date, conf)

        # 毕业证号
        value, conf = find_value_after_label([r'毕业证号', r'毕业证编号'])
        set_field('diploma_no', value, conf)

        # 学位证号
        value, conf = find_value_after_label([r'学位证号', r'学位证编号'])
        set_field('degree_no', value, conf)
        
        # 教师资格证号
        value, conf = find_value_after_label([r'教师资格证号', r'教师资格证'])
        set_field('teacher_cert_no', value, conf)
        
        # 教师资格种类
        value, conf = find_value_after_label([r'教师资格种类', r'教师资格类型'])
        set_field('teacher_cert_type', value, conf)
        
        # 职称等级
        value, conf = find_value_after_label([r'职称等级', r'职称'])
        set_field('title_rank', value, conf)

        # 职称证号
        value, conf = find_value_after_label([r'职称证号', r'职称证书编号'])
        set_field('title_cert_no', value, conf)

        # 职称取证时间
        value, conf = find_value_after_label([r'职称取证时间', r'取证日期'])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                set_field('title_cert_date', parsed_date, conf)
        
        # 任教学科
        value, conf = find_value_after_label([r'任教学科', r'学科'])
        set_field('teaching_subject', value, conf)
        
        # 任教年级
        value, conf = find_value_after_label([r'任教年级', r'年级'])
        set_field('teaching_grade', value, conf)
        
        # 家庭住址
        value, conf = find_value_after_label([r'家庭住址', r'住址', r'现住址'])
        set_field('address', value, conf)
        
        # 紧急联系人
        value, conf = find_value_after_label([r'紧急联系人'])
        set_field('emergency_contact', value, conf)
        
        # 紧急联系电话
        value, conf = find_value_after_label([r'联系电话', r'紧急联系电话'])
        set_field('emergency_phone', value, conf)

        # 参加工作时间
        value, conf = find_value_after_label([r'参加工作时间', r'参加工作日期'])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                set_field('start_work_date', parsed_date, conf)

        # 教龄
        value, conf = find_value_after_label([r'教龄'])
        if value:
            # 尝试提取数字
            match = re.search(r'(\d+)', value)
            if match:
                set_field('teaching_years', int(match.group(1)), conf)
        
        # 上一份工作经历
        value, conf = find_value_after_label([r'上一份工作经历', r'上一单位', r'原工作单位'])
        set_field('last_work', value, conf)

        # 心理证
        value, conf = find_value_after_label([r'心理证', r'心理咨询师证书'])
        set_field('psychology_cert', value, conf)

        # 持证类别
        value, conf = find_value_after_label([r'持证类别', r'证书类别'])
        set_field('certificate_type', value, conf)

        # 普通话等级
        value, conf = find_value_after_label([r'普通话等级', r'普通话水平'])
        set_field('mandarin_level', value, conf)

        # 备注
        value, conf = find_value_after_label([r'备注'])
        if value:
            set_field('remarks', value.strip(), conf)

        # 如果未从文本解析出教龄但存在参加工作时间，自动计算
        if 'teaching_years' not in fields:
            reference_date = fields.get('start_work_date') or fields.get('entry_date')
            if reference_date:
                years = self._calculate_years(reference_date)
                if years is not None:
                    set_field('teaching_years', years, confidence.get('start_work_date', confidence.get('entry_date', 0.8)))

        if 'job_status' not in fields:
            fields['job_status'] = '在职'

        return fields, confidence
    
    def _calculate_age_from_id(self, id_number: str) -> int:
        """从身份证号计算年龄"""
        if len(id_number) < 14:
            return 0
        
        try:
            birth_year = int(id_number[6:10])
            birth_month = int(id_number[10:12])
            birth_day = int(id_number[12:14])
            
            today = datetime.now()
            age = today.year - birth_year
            
            # 如果还没到生日，年龄减1
            if today.month < birth_month or (today.month == birth_month and today.day < birth_day):
                age -= 1
            
            return age
        except:
            return 0

    def _calculate_years(self, reference_date: str) -> Optional[int]:
        try:
            parsed = datetime.strptime(reference_date, '%Y-%m-%d')
        except ValueError:
            return None

        today = datetime.now()
        years = today.year - parsed.year
        if (today.month, today.day) < (parsed.month, parsed.day):
            years -= 1
        return max(years, 0)

