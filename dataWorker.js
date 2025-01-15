// 首先导入XLSX库
importScripts('https://cdn.sheetjs.com/xlsx-0.18.5/package/dist/xlsx.full.min.js');

// 数据处理 Worker
self.onmessage = function(e) {
    const { sheet, columnIndexes } = e.data;
    
    try {
        // 获取工作表范围
        let range = XLSX.utils.decode_range(sheet['!ref']);
        
        // 如果range无效，尝试手动计算范围
        if (!range || range.e.r < 4) {
            // 找到最后一行
            let lastRow = 3; // 从标题行开始
            while (true) {
                const cell = sheet[XLSX.utils.encode_cell({r: lastRow + 1, c: 1})]; // 检查ASIN列
                if (!cell || !cell.v) {
                    break;
                }
                lastRow++;
            }
            
            // 创建新的范围对象
            range = {
                s: { c: 0, r: 0 },
                e: { c: 100, r: lastRow }
            };
            
            // 更新工作表范围
            sheet['!ref'] = XLSX.utils.encode_range(range);
        }

        // 调试工作表范围
        self.postMessage({ 
            debug: true, 
            message: '工作表范围:', 
            range: range,
            totalRows: range.e.r + 1
        });

        // 读取标题行（第4行，索引为3）
        const titleRow = [];
        let emptyColumnsCount = 0;
        let C = range.s.c;
        
        // 持续读取直到连续遇到5个空列
        while (emptyColumnsCount < 5) {
            const cell = sheet[XLSX.utils.encode_cell({r: 3, c: C})];
            const value = cell ? String(cell.v).trim() : '';
            
            if (!value) {
                emptyColumnsCount++;
            } else {
                emptyColumnsCount = 0; // 重置空列计数
            }
            
            titleRow.push(value);
            C++;
        }

        // 更新列索引 - 使用更宽松的匹配规则
        const updatedColumnIndexes = {
            '仓库SKU': -1,
            'ASIN': titleRow.findIndex(title => title && title.includes('ASIN')),
            '产品标题': titleRow.findIndex(title => title && (title.includes('标题') || title.includes('名称'))),
            '账号': titleRow.findIndex(title => title && title.includes('账号')),
            '预估可售天数': titleRow.findIndex(title => title && (title.includes('预估可售天数') || title.includes('可售天数'))),
            '可售库存': titleRow.findIndex(title => title && (title.includes('可售库存') || title.includes('当前库存'))),
            '转运中': titleRow.findIndex(title => title && title.includes('转运中')),
            '在途库存-已创建': titleRow.findIndex(title => title && title.includes('已创建')),
            '在途库存-已发货': titleRow.findIndex(title => title && title.includes('已发货')),
            '在途库存-接收中': titleRow.findIndex(title => title && title.includes('接收中'))
        };

        // 调试信息
        self.postMessage({ 
            debug: true, 
            message: '找到的列索引:', 
            indexes: updatedColumnIndexes, 
            titles: titleRow,
            totalColumns: titleRow.length
        });

        // 验证是否找到任何必需的列
        const foundColumns = Object.values(updatedColumnIndexes).filter(index => index !== -1);
        if (foundColumns.length === 0) {
            throw new Error('请上传符合格式的Excel表格。表格必须包含所有列：\n' + 
                          Object.keys(updatedColumnIndexes).join('\n'));
        }

        // 验证必要的列是否存在
        const requiredColumns = ['ASIN', '产品标题', '预估可售天数', '可售库存'];
        const missingColumns = requiredColumns.filter(col => updatedColumnIndexes[col] === -1);
        
        if (missingColumns.length > 0) {
            throw new Error(`缺少必要的列: ${missingColumns.join(', ')}\n找到的列: ${titleRow.filter(t => t).join(', ')}`);
        }

        // 读取数据行（从第5行开始，索引为4）
        const processedData = [];
        let validRowCount = 0;

        // 调试信息
        let debugRows = [];

        // 读取数据行
        for(let R = 4; R <= range.e.r; R++) {
            const row = {};
            let hasData = false;

            // 读取每一列的数据
            for (const [name, index] of Object.entries(updatedColumnIndexes)) {
                if (index !== -1) {
                    const cellAddress = XLSX.utils.encode_cell({r: R, c: index});
                    const cell = sheet[cellAddress];
                    
                    // 调试前5行的数据
                    if (validRowCount < 5) {
                        debugRows.push({
                            row: R,
                            column: name,
                            cellAddress,
                            cellValue: cell ? cell.v : null
                        });
                    }

                    if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
                        // 确保数值类型的列被正确解析
                        if (['预估可售天数', '可售库存', '转运中', '在途库存-已创建', 
                             '在途库存-已发货', '在途库存-接收中'].includes(name)) {
                            // 处理数值
                            if (typeof cell.v === 'number') {
                                row[name] = cell.v;
                            } else if (cell.v === '--') {
                                row[name] = 0;
                            } else {
                                // 尝试解析数字字符串
                                const parsed = parseFloat(String(cell.v).replace(/,/g, ''));
                                row[name] = isNaN(parsed) ? 0 : parsed;
                            }
                        } else {
                            row[name] = cell.v;
                        }
                        hasData = true;
                    } else {
                        row[name] = name.includes('库存') || name.includes('天数') ? 0 : null;
                    }
                }
            }

            // 检查是否为有效行
            if (hasData && row['ASIN'] && row['产品标题']) {
                // 确保数值字段为数字类型
                ['预估可售天数', '可售库存', '转运中', '在途库存-已创建', 
                 '在途库存-已发货', '在途库存-接收中'].forEach(field => {
                    row[field] = typeof row[field] === 'number' ? row[field] : 0;
                });
                
                processedData.push(row);
                validRowCount++;

                // 调试输出前5行有效数据
                if (validRowCount <= 5) {
                    self.postMessage({ 
                        debug: true, 
                        message: `第${validRowCount}行有效数据:`, 
                        rowData: row 
                    });
                }
            }
        }

        // 添加调试信息
        self.postMessage({ 
            debug: true, 
            message: '数据处理调试:', 
            rowCount: validRowCount,
            totalRows: range.e.r - 3,
            sampleData: processedData.slice(0, 3),
            debugRows: debugRows
        });

        if (processedData.length === 0) {
            throw new Error(`未找到有效数据。请检查数据格式是否正确。\n已检查 ${range.e.r - 3} 行数据。\n请确保数据从第5行开始。`);
        } else {
            self.postMessage(processedData);
        }
    } catch (error) {
        self.postMessage({ error: error.message });
    }
}; 
