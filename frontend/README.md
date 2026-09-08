# AI安全王 - 管理后台前端

基于 React + Ant Design v5 构建的AI安全王管理后台系统。

## 技术栈

- React 18
- Ant Design v5
- Ant Design Charts
- React Router v6
- Axios
- Day.js

## 项目结构

```
ai-safety-admin/frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.js          # 主入口，路由配置
│   ├── index.js        # React渲染入口
│   ├── api/
│   │   └── index.js    # Axios配置（拦截器）
│   ├── components/
│   │   └── Layout.js   # 侧边栏+顶部布局
│   ├── pages/
│   │   ├── Login.js         # 登录页
│   │   ├── Dashboard.js     # 数据看板
│   │   ├── Standards.js     # 安全标准库
│   │   ├── Hazards.js       # 隐患字典
│   │   ├── Samples.js       # 图片样本库
│   │   ├── Models.js        # AI模型配置
│   │   ├── Prompts.js       # Prompt模板
│   │   ├── Inference.js     # 推理设置
│   │   ├── Tasks.js         # 识别任务
│   │   ├── RAG.js           # RAG知识库
│   │   ├── Export.js        # 数据导出
│   │   └── Settings.js      # 系统设置
│   └── utils/
│       └── storage.js       # localStorage工具
├── package.json
├── .env
└── README.md
```

## 安装与运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm start

# 构建生产包
npm build
```

开发服务器默认运行在 `http://localhost:3000`。

API请求通过 `/api` 前缀代理到后端服务器（默认 `http://localhost:8000`）。

## 功能模块

| 路由 | 功能 |
|------|------|
| /login | 管理员登录 |
| /dashboard | 数据统计看板（统计卡片、图表、告警） |
| /standards | 安全标准库管理（CRUD + 导入导出） |
| /hazards | 隐患字典管理（CRUD + 批量导入） |
| /samples | 图片样本库（卡片展示、上传、精选） |
| /models | AI模型配置（多模型管理、默认设置） |
| /prompts | Prompt模板管理（编辑、测试） |
| /inference | 推理参数设置与限流管控 |
| /tasks | 识别任务管理与人工复核 |
| /rag | RAG知识库（文档上传、检索测试） |
| /export | 数据导出中心 |
| /settings | 系统设置（密码、黑名单、限流） |
