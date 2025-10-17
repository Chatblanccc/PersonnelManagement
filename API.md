# API 接口文档

教师合同管理系统 RESTful API 文档

## 基础信息

- **Base URL**: `http://localhost:8000/api`
- **认证方式**: JWT Bearer Token
- **Content-Type**: `application/json`

## 接口列表

### 1. 上传合同文件并 OCR 识别

**POST** `/contracts/upload`

上传合同文件（PDF/图片），系统自动进行 OCR 识别并返回结构化数据。

**请求参数：**

- `file` (FormData): 合同文件
  - 支持格式：PDF, JPG, PNG
  - 最大大小：10MB

**响应示例：**

```json
{
  "contract": {
    "teacher_code": "T20240001",
    "name": "张三",
    "department": "小学部",
    "gender": "男",
    "id_number": "320102199001011234",
    "phone_number": "13800138000",
    "education": "本科",
    "entry_date": "2024-01-15",
    "contract_start": "2024-01-15",
    "contract_end": "2026-01-14",
    "ocr_confidence": 0.92
  },
  "confidence": {
    "teacher_code": 0.95,
    "name": 0.98,
    "department": 0.88,
    "gender": 0.99,
    "id_number": 0.87,
    "phone_number": 0.92
  },
  "raw_text": "教师聘用合同\n姓名：张三\n工号：T20240001\n..."
}
```

---

### 2. 获取合同列表

**GET** `/contracts`

获取合同列表，支持分页和筛选。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| page_size | int | 否 | 每页数量，默认 20，最大 100 |
| department | string | 否 | 部门筛选 |
| job_status | string | 否 | 在职状态（在职/离职/试用期） |
| search | string | 否 | 搜索关键词（姓名/工号/部门） |

**响应示例：**

```json
{
  "data": [
    {
      "id": "uuid-1234",
      "teacher_code": "T20240001",
      "name": "张三",
      "department": "小学部",
      "position": "语文教师",
      "gender": "男",
      "age": 34,
      "entry_date": "2024-01-15",
      "contract_start": "2024-01-15",
      "contract_end": "2026-01-14",
      "job_status": "在职",
      "education": "本科",
      "phone_number": "13800138000",
      "ocr_confidence": 0.92,
      "created_at": "2024-01-15T10:30:00",
      "updated_at": "2024-01-15T10:30:00"
    }
  ],
  "total": 156,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

---

### 3. 获取单个合同详情

**GET** `/contracts/{contract_id}`

获取指定 ID 的合同详细信息。

**路径参数：**

- `contract_id`: 合同 UUID

**响应示例：**

```json
{
  "id": "uuid-1234",
  "teacher_code": "T20240001",
  "name": "张三",
  "department": "小学部",
  "position": "语文教师",
  "gender": "男",
  "age": 34,
  "nation": "汉族",
  "political_status": "中共党员",
  "id_number": "320102199001011234",
  "birthplace": "江苏南京",
  "entry_date": "2024-01-15",
  "regular_date": "2024-04-15",
  "contract_start": "2024-01-15",
  "contract_end": "2026-01-14",
  "job_status": "在职",
  "phone_number": "13800138000",
  "education": "本科",
  "graduation_school": "南京师范大学",
  "major": "汉语言文学",
  "degree": "学士",
  "teacher_cert_no": "20201234567890",
  "teaching_subject": "语文",
  "teaching_grade": "三年级",
  "address": "南京市建邺区XX路XX号",
  "emergency_contact": "李四",
  "emergency_phone": "13900139000",
  "remarks": "",
  "file_url": "/uploads/20240115_103000_contract.pdf",
  "ocr_confidence": 0.92,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

---

### 4. 创建合同记录

**POST** `/contracts`

手动创建合同记录。

**请求体：**

```json
{
  "teacher_code": "T20240001",
  "name": "张三",
  "department": "小学部",
  "position": "语文教师",
  "gender": "男",
  "id_number": "320102199001011234",
  "phone_number": "13800138000",
  "education": "本科",
  "entry_date": "2024-01-15",
  "contract_start": "2024-01-15",
  "contract_end": "2026-01-14",
  "job_status": "在职"
}
```

**响应：** 与获取单个合同详情相同

---

### 5. 更新合同信息

**PATCH** `/contracts/{contract_id}`

更新指定合同的信息（部分更新）。

**路径参数：**

- `contract_id`: 合同 UUID

**请求体示例：**

```json
{
  "position": "高级语文教师",
  "title_rank": "中级",
  "phone_number": "13800138001"
}
```

**响应：** 与获取单个合同详情相同

---

### 6. 删除合同

**DELETE** `/contracts/{contract_id}`

删除指定的合同记录。

**路径参数：**

- `contract_id`: 合同 UUID

**响应示例：**

```json
{
  "message": "删除成功"
}
```

---

### 7. 导出 Excel

**GET** `/contracts/export`

导出符合条件的合同列表为 Excel 文件。

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| department | string | 否 | 部门筛选 |
| job_status | string | 否 | 在职状态筛选 |
| search | string | 否 | 搜索关键词 |

**响应：**

- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 文件名：`contracts_YYYYmmdd_HHMMSS.xlsx`

---

### 8. 获取仪表盘统计

**GET** `/contracts/stats/dashboard`

获取系统仪表盘统计数据。

**响应示例：**

```json
{
  "totalTeachers": 156,
  "activeContracts": 142,
  "expiringSoon": 8,
  "pendingReview": 3
}
```

---

## 错误响应

所有接口在发生错误时返回统一的错误格式：

```json
{
  "detail": "错误信息描述"
}
```

**常见 HTTP 状态码：**

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，需要登录 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 数据字段说明

### 合同字段完整列表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | string | 合同 UUID |
| teacher_code | string | 员工工号 |
| department | string | 部门 |
| name | string | 姓名 |
| position | string | 职务 |
| gender | string | 性别 |
| age | int | 年龄 |
| nation | string | 民族 |
| political_status | string | 政治面貌 |
| id_number | string | 身份证号（加密存储） |
| birthplace | string | 籍贯 |
| entry_date | date | 入职日期 |
| regular_date | date | 转正日期 |
| contract_start | date | 合同开始日 |
| contract_end | date | 合同到期日 |
| job_status | string | 在职状态 |
| resign_date | date | 离职日期 |
| phone_number | string | 电话号码（加密存储） |
| education | string | 最高学历 |
| graduation_school | string | 毕业院校 |
| diploma_no | string | 毕业证号 |
| graduation_date | date | 毕业时间 |
| major | string | 专业 |
| degree | string | 学位 |
| degree_no | string | 学位证号 |
| teacher_cert_type | string | 教师资格种类 |
| teacher_cert_no | string | 教师资格证号 |
| title_rank | string | 职称等级 |
| title_cert_no | string | 职称证号 |
| title_cert_date | date | 职称取证时间 |
| start_work_date | date | 参加工作时间 |
| teaching_years | int | 教龄（自动计算） |
| psychology_cert | string | 心理证 |
| certificate_type | string | 持证类别 |
| teaching_grade | string | 任教年级 |
| teaching_subject | string | 任教学科 |
| last_work | string | 上一份工作经历 |
| address | string | 家庭住址（加密存储） |
| emergency_contact | string | 紧急联系人 |
| emergency_phone | string | 联系电话（加密存储） |
| mandarin_level | string | 普通话等级 |
| remarks | text | 备注 |
| file_url | string | 合同文件路径 |
| ocr_confidence | float | OCR 平均置信度 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

## 在线 API 文档

系统运行后，可以访问以下地址查看交互式 API 文档：

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 示例代码

### Python 示例

```python
import requests

# 上传文件并 OCR
with open('contract.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/contracts/upload',
        files={'file': f}
    )
    result = response.json()
    print(result)

# 获取合同列表
response = requests.get(
    'http://localhost:8000/api/contracts',
    params={'page': 1, 'page_size': 20, 'department': '小学部'}
)
contracts = response.json()
```

### JavaScript 示例

```javascript
// 上传文件
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:8000/api/contracts/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();

// 获取合同列表
const response = await fetch('http://localhost:8000/api/contracts?page=1&page_size=20');
const contracts = await response.json();
```

---

更多详情请参考 FastAPI 自动生成的 API 文档。

