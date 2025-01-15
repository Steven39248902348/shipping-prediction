# 库存管理系统

这是一个基于浏览器的库存管理系统，用于处理和分析Excel格式的库存数据。系统使用纯HTML、CSS和JavaScript开发，无需后端服务器支持。

## 主要功能

- Excel文件导入与导出
- 数据自动计算与分析
  - 平均每天出单量计算
  - 在途库存可售天数计算
  - 需要补货数量计算
- SKU与ASIN自动映射
- 中英文产品标题自动翻译匹配
- 数据排序与筛选
- 历史记录管理（最多保存5条）
- 响应式表格布局
- 分页显示

## 技术特点

- 使用Web Worker处理大量数据，避免主线程阻塞
- 使用LocalStorage实现数据持久化
- 支持大文件处理（最大5MB）
- 自动适配不同Excel表头格式
- 优化的表格渲染性能
- 响应式设计，支持各种屏幕尺寸

## 使用说明

1. 确保以下文件存在于同一目录:
   - index.html
   - Translation.xlsx (用于标题翻译)
   - Warehous_Product_SKU_List.xlsx (用于SKU映射)
2. 打开index.html文件
3. 点击"导入Excel"按钮选择库存数据文件
4. 系统会自动处理数据并显示在表格中:
   - 自动匹配SKU信息
   - 自动翻译产品标题
   - 计算相关指标
5. 可以点击表头进行排序
6. 可以使用导出按钮将数据导出为Excel文件
7. 历史记录面板可以查看和加载之前的数据

## Excel文件要求

### 库存数据文件必须包含以下必要列：
- ASIN
- 产品标题
- 预估可售天数
- 可售库存

其他支持的列：
- 账号
- 转运中
- 在途库存-已创建
- 在途库存-已发货
- 在途库存-接收中

### SKU映射文件(Warehous_Product_SKU_List.xlsx)要求：
- 第一列标题必须为"仓库SKU"
- 第二列标题必须为"ASIN"
- 每行包含一个SKU和对应的ASIN

## 浏览器兼容性

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 注意事项

1. Excel文件大小限制为5MB
2. 数据从第5行开始读取（前4行为表头）
3. 历史记录最多保存最近5个文件
4. 必须配置以下辅助文件:
   - Translation.xlsx: 用于产品标题翻译
   - Warehous_Product_SKU_List.xlsx: 用于SKU与ASIN映射

## 依赖库

- XLSX.js (v0.18.5) - 用于Excel文件处理

## 文件结构
```
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 主要逻辑
├── dataWorker.js       # Web Worker 数据处理
├── Translation.xlsx    # 翻译对照表
└── Warehous_Product_SKU_List.xlsx  # SKU映射表
```

## 开发者说明

如需修改或扩展功能，主要关注以下文件：

- script.js: 包含主要业务逻辑和UI交互
- dataWorker.js: 负责Excel数据的解析和处理
- styles.css: 包含所有样式定义 
