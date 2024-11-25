// 首先导入XLSX库
importScripts('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');

// 数据处理 Worker
self.onmessage = function(e) {
    const { sheet, columnIndexes } = e.data;
    
    try {
        // 获取工作表范围
        const range = XLSX.utils.decode_range(sheet['!ref']);
        console.log('工作表范围:', range);

        // 读取标题行（第4行，索引为3）
        const titleRow = [];
        for(let C = range.s.c; C <= range.e.c; C++) {
            const cell = sheet[XLSX.utils.encode_cell({r: 3, c: C})];
            titleRow.push(cell ? cell.v : undefined);
        }
        console.log('标题行:', titleRow);

        // 更新列索引，添加新列
        const updatedColumnIndexes = {
            'ASIN': titleRow.findIndex(title => title && String(title).includes('ASIN')),
            '产品标题': titleRow.findIndex(title => title && String(title).includes('产品标题')),
            '预估可售天数': titleRow.findIndex(title => title && String(title).includes('预估可售天数')),
            '可售库存': titleRow.findIndex(title => title && String(title).includes('可售库存')),
            '转运中': titleRow.findIndex(title => title && String(title).includes('转运中')),
            '在途库存-已创建': titleRow.findIndex(title => title && String(title).includes('在途库存-已创建')),
            '在途库存-已发货': titleRow.findIndex(title => title && String(title).includes('在途库存-已发货')),
            '在途库存-接收中': titleRow.findIndex(title => title && String(title).includes('在途库存-接收中')),
            '销量-上周': titleRow.findIndex(title => title && String(title).includes('销量-上周'))
        };

        // 读取数据行（从第5行开始，索引为4）
        const processedData = [];
        for(let R = 4; R <= range.e.r; R++) {
            const row = {};
            let hasData = false;

            // 读取每一列的数据
            Object.entries(updatedColumnIndexes).forEach(([name, index]) => {
                if (index !== -1) {
                    const cellAddress = XLSX.utils.encode_cell({r: R, c: index});
                    const cell = sheet[cellAddress];
                    if (cell) {
                        row[name] = cell.v;
                        hasData = true;
                    } else {
                        row[name] = null;
                    }
                }
            });

            // 检查是否为有效行
            if (hasData && row['ASIN'] && row['产品标题']) {
                // 检查预估可售天数是否有效
                const estimatedDays = row['预估可售天数'];
                if (estimatedDays !== '--' && estimatedDays !== null && estimatedDays !== undefined) {
                    processedData.push(row);
                }
            }
        }

        console.log('处理后的数据:', processedData);

        if (processedData.length === 0) {
            throw new Error('未找到有效数据');
        }

        self.postMessage(processedData);
    } catch (error) {
        console.error('Worker处理错误:', error);
        self.postMessage({ error: error.message });
    }
}; 
