import re
from typing import Dict, Tuple, Optional
from datetime import datetime
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
    
    def extract_field(self, patterns: list, default: str = "") -> Tuple[Optional[str], float]:
        """
        根据正则表达式列表提取字段
        返回：(值, 置信度)
        """
        for pattern in patterns:
            match = re.search(pattern, self.full_text, re.IGNORECASE)
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
    
    def extract_all_fields(self) -> Tuple[Dict, Dict[str, float]]:
        """
        提取所有字段
        返回：(字段字典, 置信度字典)
        """
        fields = {}
        confidence = {}
        
        # 员工工号
        value, conf = self.extract_field([
            r'工号[：:]\s*(\w+)',
            r'员工编号[：:]\s*(\w+)',
        ])
        if value:
            fields['teacher_code'] = value
            confidence['teacher_code'] = conf
        
        # 姓名
        value, conf = self.extract_field([
            r'姓名[：:]\s*([^\s]+)',
            r'姓\s*名[：:]\s*([^\s]+)',
        ])
        if value:
            fields['name'] = value
            confidence['name'] = conf
        
        # 性别
        value, conf = self.extract_field([
            r'性别[：:]\s*([男女])',
        ])
        if value:
            fields['gender'] = value
            confidence['gender'] = conf
        
        # 民族
        value, conf = self.extract_field([
            r'民族[：:]\s*([^\s]+)',
        ])
        if value:
            fields['nation'] = value
            confidence['nation'] = conf
        
        # 身份证号
        value, conf = self.extract_field([
            r'身份证号[码]?[：:]\s*(\d{15,18}[Xx\d]?)',
            r'证件号码[：:]\s*(\d{15,18}[Xx\d]?)',
        ])
        if value:
            fields['id_number'] = value
            confidence['id_number'] = conf
            # 从身份证号计算年龄
            fields['age'] = self._calculate_age_from_id(value)
        
        # 籍贯
        value, conf = self.extract_field([
            r'籍贯[：:]\s*([^\s]+)',
        ])
        if value:
            fields['birthplace'] = value
            confidence['birthplace'] = conf
        
        # 政治面貌
        value, conf = self.extract_field([
            r'政治面貌[：:]\s*([^\s]+)',
            r'党派[：:]\s*([^\s]+)',
        ])
        if value:
            fields['political_status'] = value
            confidence['political_status'] = conf
        
        # 部门
        value, conf = self.extract_field([
            r'部门[：:]\s*([^\s]+)',
            r'所在部门[：:]\s*([^\s]+)',
        ])
        if value:
            fields['department'] = value
            confidence['department'] = conf
        
        # 职务
        value, conf = self.extract_field([
            r'职务[：:]\s*([^\s]+)',
            r'岗位[：:]\s*([^\s]+)',
        ])
        if value:
            fields['position'] = value
            confidence['position'] = conf
        
        # 入职日期
        value, conf = self.extract_field([
            r'入职日期[：:]\s*([^\s]+)',
            r'入职时间[：:]\s*([^\s]+)',
        ])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                fields['entry_date'] = parsed_date
                confidence['entry_date'] = conf
        
        # 合同开始日期
        value, conf = self.extract_field([
            r'合同[起]?始日期[：:]\s*([^\s]+)',
            r'合同生效日期[：:]\s*([^\s]+)',
        ])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                fields['contract_start'] = parsed_date
                confidence['contract_start'] = conf
        
        # 合同结束日期
        value, conf = self.extract_field([
            r'合同[终]?止日期[：:]\s*([^\s]+)',
            r'合同到期日[：:]\s*([^\s]+)',
        ])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                fields['contract_end'] = parsed_date
                confidence['contract_end'] = conf
        
        # 电话号码
        value, conf = self.extract_field([
            r'[手机]*电话[号码]*[：:]\s*(1[3-9]\d{9})',
            r'联系方式[：:]\s*(1[3-9]\d{9})',
        ])
        if value:
            fields['phone_number'] = value
            confidence['phone_number'] = conf
        
        # 最高学历
        value, conf = self.extract_field([
            r'[最高]*学历[：:]\s*([^\s]+)',
        ])
        if value:
            fields['education'] = value
            confidence['education'] = conf
        
        # 毕业院校
        value, conf = self.extract_field([
            r'毕业院校[：:]\s*([^\s]+)',
            r'毕业学校[：:]\s*([^\s]+)',
        ])
        if value:
            fields['graduation_school'] = value
            confidence['graduation_school'] = conf
        
        # 专业
        value, conf = self.extract_field([
            r'专业[：:]\s*([^\s]+)',
            r'所学专业[：:]\s*([^\s]+)',
        ])
        if value:
            fields['major'] = value
            confidence['major'] = conf
        
        # 学位
        value, conf = self.extract_field([
            r'学位[：:]\s*([^\s]+)',
        ])
        if value:
            fields['degree'] = value
            confidence['degree'] = conf
        
        # 毕业时间
        value, conf = self.extract_field([
            r'毕业时间[：:]\s*([^\s]+)',
            r'毕业日期[：:]\s*([^\s]+)',
        ])
        if value:
            parsed_date = self.parse_date(value)
            if parsed_date:
                fields['graduation_date'] = parsed_date
                confidence['graduation_date'] = conf
        
        # 教师资格证
        value, conf = self.extract_field([
            r'教师资格证[号码]*[：:]\s*([^\s]+)',
        ])
        if value:
            fields['teacher_cert_no'] = value
            confidence['teacher_cert_no'] = conf
        
        # 职称
        value, conf = self.extract_field([
            r'职称[：:]\s*([^\s]+)',
        ])
        if value:
            fields['title_rank'] = value
            confidence['title_rank'] = conf
        
        # 任教学科
        value, conf = self.extract_field([
            r'任教学科[：:]\s*([^\s]+)',
            r'学科[：:]\s*([^\s]+)',
        ])
        if value:
            fields['teaching_subject'] = value
            confidence['teaching_subject'] = conf
        
        # 任教年级
        value, conf = self.extract_field([
            r'任教年级[：:]\s*([^\s]+)',
            r'年级[：:]\s*([^\s]+)',
        ])
        if value:
            fields['teaching_grade'] = value
            confidence['teaching_grade'] = conf
        
        # 家庭住址
        value, conf = self.extract_field([
            r'[家庭]*住址[：:]\s*([^\n]+)',
            r'居住地址[：:]\s*([^\n]+)',
        ])
        if value:
            fields['address'] = value
            confidence['address'] = conf
        
        # 紧急联系人
        value, conf = self.extract_field([
            r'紧急联系人[：:]\s*([^\s]+)',
        ])
        if value:
            fields['emergency_contact'] = value
            confidence['emergency_contact'] = conf
        
        # 紧急联系电话
        value, conf = self.extract_field([
            r'紧急联系[电话]*[：:]\s*(1[3-9]\d{9})',
        ])
        if value:
            fields['emergency_phone'] = value
            confidence['emergency_phone'] = conf
        
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

