// 在文件开头添加全局变量
let currentData = null;
let fileHistory = [];
let columnIndexes = {};

// 添加排序状态变量
let sortState = {
    column: null,
    direction: 'desc' // 'asc' 或 'desc'
};

// 页面加载时从localStorage读取数据
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    createFileHistoryUI();
});

// 保存数据到localStorage
function saveToLocalStorage(data, fileName) {
    try {
        // 保存当前数据
        localStorage.setItem('currentData', JSON.stringify(data));
        
        // 更新文件历史
        let history = JSON.parse(localStorage.getItem('fileHistory') || '[]');
        const timestamp = new Date().toISOString();
        
        // 添加新的文件记录
        history.unshift({
            fileName,
            timestamp,
            data
        });
        
        // 只保留最近的5个文件
        history = history.slice(0, 5);
        
        localStorage.setItem('fileHistory', JSON.stringify(history));
        
        // 更新UI
        createFileHistoryUI();
        
    } catch (error) {
        console.error('保存数据失败:', error);
    }
}

// 从localStorage加载数据
function loadSavedData() {
    try {
        const savedData = localStorage.getItem('currentData');
        if (savedData) {
            currentData = JSON.parse(savedData);
            displayPreview(currentData);
            document.getElementById('clearButton').style.display = 'inline-block';
        }
    } catch (error) {
        console.error('加载保存的数据失败:', error);
    }
}

// 创建文件历史UI
function createFileHistoryUI() {
    const historyContainer = document.getElementById('fileHistory');
    if (!historyContainer) return;

    try {
        const history = JSON.parse(localStorage.getItem('fileHistory') || '[]');
        
        historyContainer.innerHTML = `
            <div class="history-header">
                <h3>历史文件</h3>
            </div>
            <div class="history-list">
                ${history.map((file, index) => `
                    <div class="history-item">
                        <span class="file-name">${file.fileName}</span>
                        <span class="file-time">${new Date(file.timestamp).toLocaleString()}</span>
                        <button onclick="loadHistoryFile(${index})">加载</button>
                        <button onclick="deleteHistoryFile(${index})">删除</button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('创建历史记录UI失败:', error);
    }
}

// 加载历史文件
function loadHistoryFile(index) {
    try {
        const history = JSON.parse(localStorage.getItem('fileHistory') || '[]');
        const fileData = history[index];
        if (fileData) {
            currentData = fileData.data;
            displayPreview(currentData);
        }
    } catch (error) {
        console.error('加载历史文件失败:', error);
    }
}

// 删除历史文件
function deleteHistoryFile(index) {
    try {
        const history = JSON.parse(localStorage.getItem('fileHistory') || '[]');
        history.splice(index, 1);
        localStorage.setItem('fileHistory', JSON.stringify(history));
        createFileHistoryUI();
    } catch (error) {
        console.error('删除历史文件失败:', error);
    }
}

document.getElementById('fileUpload').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
        alert('文件大小不能超过5MB');
        return;
    }

    const reader = new FileReader();
    document.getElementById('loading').style.display = 'flex';

    // 使用 requestAnimationFrame 来优化性能
    requestAnimationFrame(() => {
        reader.onload = function(e) {
            try {
                // 使用 setTimeout 来分解大型计算任务
                setTimeout(() => {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {
                        type: 'array',
                        cellDates: true,
                        cellNF: false,
                        cellText: false,
                        WTF: true
                    });
                    
                    // 获取第一个工作表
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    
                    // 使用 Web Worker 来处理数据（如果浏览器支持）
                    if (window.Worker) {
                        processDataInWorker(sheet);
                    } else {
                        processDataDirectly(sheet);
                    }
                }, 0);
            } catch (error) {
                console.error('Excel处理错误:', error);
                alert('处理Excel文件时出错：' + error.message);
                document.getElementById('loading').style.display = 'none';
            }
        };

        reader.readAsArrayBuffer(file);
    });
}

// 修改 Web Worker 处理函数
function processDataInWorker(sheet) {
    const worker = new Worker('dataWorker.js');
    
    worker.onmessage = function(e) {
        if (e.data.error) {
            console.error('Worker处理错误:', e.data.error);
            alert('处理Excel文件时出错：' + e.data.error);
            document.getElementById('loading').style.display = 'none';
            return;
        }

        const processedData = e.data;
        if (!Array.isArray(processedData) || processedData.length === 0) {
            alert('未能读取到有效数据');
            document.getElementById('loading').style.display = 'none';
            return;
        }

        currentData = processedData;
        saveToLocalStorage(processedData, 'uploaded_file.xlsx');
        displayPreview(processedData);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('clearButton').style.display = 'inline-block';
    };

    worker.onerror = function(error) {
        console.error('Worker错误:', error);
        alert('处理文件时发生错误');
        document.getElementById('loading').style.display = 'none';
    };

    worker.postMessage({
        sheet: sheet,
        columnIndexes: columnIndexes
    });
}

// 直接处理数据的函数（当不支持 Web Worker 时使用）
function processDataDirectly(sheet) {
    // 原有的数据处理逻辑
    // ... 保持不变
}

// 修改displayPreview函数
function displayPreview(data) {
    const table = document.getElementById('dataTable');
    table.innerHTML = '';

    // 清除旧的分页控件
    const oldPagination = document.querySelector('.pagination');
    if (oldPagination) {
        oldPagination.remove();
    }

    // 创建表头行
    const headerRow = document.createElement('tr');
    table.appendChild(headerRow);

    // 动态创建headers数组，根据是否找到"销量-上周"列
    const baseHeaders = [
        'ASIN',
        '产品标题',
        '预估可售天数',
        '可售库存',
        '转运中',
        '在途库存-已创建',
        '在途库存-已发货',
        '在途库存-接收中',
        '平均每天出单',
        '在途库存可售天数',
        '需要补货数量'
    ];

    // 如果找到了"销量-上周"列，则添加到headers中
    const headers = columnIndexes['销量-上周'] !== -1 ? 
        ['ASIN', '产品标题', '销量-上周', ...baseHeaders.slice(2)] : 
        baseHeaders;

    // 定义数字列
    const numericColumns = [
        '销量-上周',
        '预估可售天数',
        '可售库存',
        '转运中',
        '在途库存-已创建',
        '在途库存-已发货',
        '在途库存-接收中',
        '平均每天出单',
        '在途库存可售天数',
        '需要补货数量'
    ];
    
    headers.forEach(header => {
        const th = document.createElement('th');
        const headerContent = document.createElement('div');
        headerContent.className = 'header-content';
        
        // 添加标题文本
        const titleSpan = document.createElement('span');
        titleSpan.textContent = header;
        headerContent.appendChild(titleSpan);

        // 为数字列添加排序功能
        if (numericColumns.includes(header)) {
            // 添加排序状态指示器
            const sortIndicator = document.createElement('span');
            sortIndicator.className = 'sort-indicator';
            headerContent.appendChild(sortIndicator);

            // 设置初始排序状态
            th.dataset.sortState = 'none'; // 'none', 'asc', 'desc'
            
            // 添加点击事件
            th.addEventListener('click', () => {
                // 更新所有其他列的排序状态
                headerRow.querySelectorAll('th').forEach(otherTh => {
                    if (otherTh !== th) {
                        otherTh.dataset.sortState = 'none';
                    }
                });

                // 循环切换排序状态：none -> asc -> desc -> none
                switch (th.dataset.sortState) {
                    case 'none':
                        th.dataset.sortState = 'asc';
                        break;
                    case 'asc':
                        th.dataset.sortState = 'desc';
                        break;
                    case 'desc':
                        th.dataset.sortState = 'none';
                        break;
                }

                // 根据排序状态排序数据
                let sortedData;
                if (th.dataset.sortState === 'none') {
                    // 恢复默认排序（使用原始数据）
                    sortedData = [...currentData];
                } else {
                    sortedData = [...data].sort((a, b) => {
                        const valueA = parseFloat(a[header]) || 0;
                        const valueB = parseFloat(b[header]) || 0;
                        return th.dataset.sortState === 'asc' ? 
                            valueA - valueB : 
                            valueB - valueA;
                    });
                }

                // 重新显示数据
                displayData(sortedData);
            });
        }

        th.appendChild(headerContent);
        headerRow.appendChild(th);
    });

    displayData(data);
}

// 添加显示数据的辅助函数
function displayData(data) {
    const table = document.getElementById('dataTable');
    const headers = [
        'ASIN',
        '产品标题',
        '销量-上周',
        '预估可售天数',
        '可售库存',
        '转运中',
        '在途库存-已创建',
        '在途库存-已发货',
        '在途库存-接收中',
        '平均每天出单',
        '在途库存可售天数',
        '需要补货数量'
    ];

    // 清除现有数据行
    const existingRows = table.querySelectorAll('tr:not(:first-child)');
    existingRows.forEach(row => row.remove());

    const oldPagination = document.querySelector('.pagination');
    if (oldPagination) {
        oldPagination.remove();
    }
    
    // 分页设置
    const itemsPerPage = 50;
    const totalPages = Math.ceil(data.length / itemsPerPage);
    let currentPage = 1;

    function showPage(page) {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = data.slice(start, end);

        // 清除现有数据行
        const existingRows = table.querySelectorAll('tr:not(:first-child)');
        existingRows.forEach(row => row.remove());

        // 添加数据行
        pageData.forEach((row, index) => {
            const tr = document.createElement('tr');
            const rowNum = start + index + 1;
            tr.dataset.rowNum = rowNum;

            headers.forEach(header => {
                const td = document.createElement('td');
                let value = row[header];
                
                // 首先计算平均每天出单
                if (!row.hasOwnProperty('平均每天出单')) {
                    const totalDays = parseFloat(row['预估可售天数']);
                    // 如果预估可售天数无效，跳过这行数据
                    if (isNaN(totalDays) || totalDays === '--' || totalDays === 0) {
                        return;
                    }
                    const inventory = parseFloat(row['可售库存']) || 0;
                    const transit = parseFloat(row['转运中']) || 0;
                    const receiving = parseFloat(row['在途库存-接收中']) || 0;
                    // 修改后的计算公式
                    row['平均每天出单'] = (inventory + transit + receiving) / totalDays;
                }

                // 然后计算在途库存可售天数
                if (!row.hasOwnProperty('在途库存可售天数')) {
                    const created = parseFloat(row['在途库存-已创建']) || 0;
                    const shipped = parseFloat(row['在途库存-已发货']) || 0;
                    const avgDailySales = row['平均每天出单'] || 1; // 使用已计算的值
                    row['在途库存可售天数'] = (created + shipped) / avgDailySales;
                }

                // 最后计算需要补货数量
                if (!row.hasOwnProperty('需要补货数量')) {
                    const estimatedDays = parseFloat(row['预估可售天数']) || 0;
                    const transitDays = row['在途库存可售天数'] || 0; // 使用已计算的值
                    const avgDailySales = row['平均每天出单'] || 0; // 使用已��算的值
                    row['需要补货数量'] = Math.max(0, (70 - estimatedDays - transitDays) * avgDailySales);
                }

                // 获取当前列的值
                value = row[header];
                
                // 显示格式化的值
                if (value === null || value === undefined || value === '') {
                    td.textContent = '-';
                } else if (typeof value === 'number') {
                    if (header === '预估可售天数') {
                        td.textContent = value.toFixed(1);
                        if (value < 30) {
                            td.style.color = 'red';
                            td.style.fontWeight = 'bold';
                            td.textContent += ' ⚠️';
                        } else if (value < 50) {
                            td.style.color = '#2196F3';
                            td.style.fontWeight = 'bold';
                            td.textContent += ' 📦';
                        }
                    } else if (header === '销量-上周') {
                        td.textContent = value.toLocaleString('zh-CN');
                        if (value > 50) {
                            td.style.color = '#ff6b00';
                            td.style.fontWeight = 'bold';
                            td.textContent += ' 🔥';
                        }
                    } else if (['平均每天出单', '在途库存可售天数'].includes(header)) {
                        td.textContent = value.toFixed(1); // 保留一位小数
                    } else if (header === '需要补货数量') {
                        td.textContent = Math.ceil(value).toLocaleString('zh-CN'); // 向上取整
                        if (value > 0) {
                            td.style.color = '#e91e63';
                            td.style.fontWeight = 'bold';
                        }
                    } else {
                        td.textContent = value.toLocaleString('zh-CN');
                    }
                } else {
                    td.textContent = value.toString();
                }
                
                tr.appendChild(td);
            });

            if (rowNum % 2 === 0) {
                tr.style.backgroundColor = '#f9f9f9';
            }

            table.appendChild(tr);
        });

        updatePagination(page, totalPages);
    }

    // 创建分页控件
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    table.parentElement.appendChild(paginationDiv);

    function updatePagination(currentPage, totalPages) {
        paginationDiv.innerHTML = '';
        
        // 添加页码按钮
        const addPageButton = (pageNum, text) => {
            const button = document.createElement('button');
            button.textContent = text || pageNum;
            button.className = pageNum === currentPage ? 'page-button active' : 'page-button';
            button.onclick = () => showPage(pageNum);
            paginationDiv.appendChild(button);
        };

        // 添加页码
        if (totalPages <= 7) {
            // 如果总页数较少，显示所有页码
            for (let i = 1; i <= totalPages; i++) {
                addPageButton(i);
            }
        } else {
            // 显示部分页码
            addPageButton(1);
            if (currentPage > 3) {
                paginationDiv.appendChild(document.createTextNode('...'));
            }
            
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(currentPage + 1, totalPages - 1); i++) {
                addPageButton(i);
            }
            
            if (currentPage < totalPages - 2) {
                paginationDiv.appendChild(document.createTextNode('...'));
            }
            addPageButton(totalPages);
        }

        // 添加总记录数显示
        const totalRecords = document.createElement('span');
        totalRecords.className = 'total-records';
        totalRecords.textContent = `共 ${data.length} 条记录`;
        paginationDiv.appendChild(totalRecords);
    }

    // 显示第一页数据
    showPage(1);
}

// 添加一个清除当前数据的函数
function clearCurrentData() {
    currentData = null;
    localStorage.removeItem('currentData');
    
    // 清除表格和统计数据
    const table = document.getElementById('dataTable');
    const predictionResult = document.getElementById('predictionResult');
    const paginationDiv = document.querySelector('.pagination');
    const clearButton = document.getElementById('clearButton');
    
    if (table) table.innerHTML = '';
    if (predictionResult) predictionResult.innerHTML = '';
    if (paginationDiv) paginationDiv.remove();
    if (clearButton) clearButton.style.display = 'none';

    // 重新创建历史UI
    createFileHistoryUI();
} 
