// 在文件开头添加全局变量
let currentData = null;
let fileHistory = [];
let columnIndexes = {};
let targetDays = 60; // 默认目标在途库存天数
let filteredData = null;

// 添加基础表头定义为全局变量
const baseHeaders = [
    'ASIN',
    '产品标题',
    '账号',
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

// 添加全局 headers 变量
let headers = [...baseHeaders];

// 添加排序状态变量
let sortState = {
    column: null,
    direction: 'desc' // 'asc' 或 'desc'
};

// 添加数字列定义
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

// 在文件开头添加变量
let hasData = false;

// 找到动态按钮元素
const dynamicButton = document.getElementById('dynamicButton');

// 在文件开头添加一个变量来保存原始数据顺序
let originalData = null;

// 将 showPage 函数移到全局作用域
let workingData = null; // 添加全局变量
const itemsPerPage = 20; // 移到全局作用域

function showPage(page) {
    if (!workingData) return;
    
    console.log('开始显示页面:', page);
    console.log('当前排序状态:', sortState);

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = workingData.slice(start, end);

    const table = document.getElementById('dataTable');
    
    // 如果表格不存在，创建表格结构
    if (!table.querySelector('tr')) {
        // 创建表头行
        let headerRow = document.createElement('tr');
        
        // 添加表头
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            
            if (numericColumns.includes(header)) {
                th.style.cursor = 'pointer';
                th.dataset.column = header;
                
                th.addEventListener('click', () => {
                    // ... 排序逻辑保持不变 ...
                });
            }
            
            headerRow.appendChild(th);
        });
        
        table.appendChild(headerRow);
    }

    // 更新表格内容
    updateTableContent(page);
}

// 页面加载时从localStorage读取数据
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    createFileHistoryUI();
    
    // 添加目标天数变更监听
    const targetDaysInput = document.getElementById('targetDays');
    const fileUpload = document.getElementById('fileUpload');
    const dynamicButton = document.getElementById('dynamicButton');
    
    // 动态按钮点击事件
    dynamicButton.addEventListener('click', function() {
        if (hasData) {
            clearAllData();
            dynamicButton.textContent = '导入Excel';
            hasData = false;
        } else {
            fileUpload.click();
        }
    });

    // 文件选择变更事件
    fileUpload.addEventListener('change', handleFileUpload);
    
    // 添加input事件监听，实时响应变化
    targetDaysInput.addEventListener('input', () => {
        const newValue = parseInt(targetDaysInput.value) || 60;
        // 限制输入范围
        if (newValue < 1) targetDaysInput.value = 1;
        if (newValue > 180) targetDaysInput.value = 180;
        
        targetDays = parseInt(targetDaysInput.value);
        if (currentData) {
            // 重新计算需要补货数量
            currentData.forEach(row => {
                // 删除旧的计算结果，强制重新计算
                delete row['需要补货数量'];
            });
            displayPreview(currentData);
        }
    });

    // 修改失焦事件监听，只保存目标天数设置，不保存数据
    targetDaysInput.addEventListener('blur', () => {
        targetDays = parseInt(targetDaysInput.value) || 60;
        localStorage.setItem('targetDays', targetDays.toString());
    });
});

// 保存数据到localStorage
function saveToLocalStorage(data, fileName, updateHistory = true) {
    try {
        // 保存当前数据
        localStorage.setItem('currentData', JSON.stringify(data));
        localStorage.setItem('targetDays', targetDays.toString());
        
        // 只在需要时更新文件历史
        if (updateHistory) {
            let history = JSON.parse(localStorage.getItem('fileHistory') || '[]');
            const timestamp = new Date().toISOString();
            
            // 检查是否已存在相同文件名的记录
            const existingIndex = history.findIndex(item => item.fileName === fileName);
            if (existingIndex !== -1) {
                // 如果存在，更新现有记录
                history[existingIndex] = {
                    fileName,
                    timestamp,
                    data
                };
            } else {
                // 如果不存在，添加新记录
                history.unshift({
                    fileName,
                    timestamp,
                    data
                });
                
                // 只保留最近的5个文件
                history = history.slice(0, 5);
            }
            
            localStorage.setItem('fileHistory', JSON.stringify(history));
            
            // 更新UI
            createFileHistoryUI();
        }
        
    } catch (error) {
        console.error('保存数据失败:', error);
    }
}

// 从localStorage加载数据
function loadSavedData() {
    try {
        const savedData = localStorage.getItem('currentData');
        const savedTargetDays = localStorage.getItem('targetDays');
        
        if (savedTargetDays) {
            targetDays = parseInt(savedTargetDays);
            document.getElementById('targetDays').value = targetDays;
        }
        
        if (savedData) {
            currentData = JSON.parse(savedData);
            originalData = [...currentData]; // 保存原始数据顺序
            displayPreview(currentData);
            // 更新动态按钮状态
            hasData = true;
            const dynamicButton = document.getElementById('dynamicButton');
            if (dynamicButton) {
                dynamicButton.textContent = '清除数据';
            }
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
        
        historyContainer.innerHTML = history.map((file, index) => `
            <div class="history-item">
                <div class="file-info">
                    <span class="file-name">${file.fileName}</span>
                    <span class="file-time">${new Date(file.timestamp).toLocaleString()}</span>
                </div>
                <div class="history-actions">
                    <button class="history-button" onclick="loadHistoryFile(${index})">加载</button>
                    <button class="history-button delete" onclick="deleteHistoryFile(${index})">删除</button>
                </div>
            </div>
        `).join('');
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
            originalData = [...fileData.data]; // 添加这行，保存原始数据顺序
            filteredData = null; // 重置筛选数据
            displayPreview(currentData);
            
            // 更新动态按钮状态
            hasData = true;
            const dynamicButton = document.getElementById('dynamicButton');
            if (dynamicButton) {
                dynamicButton.textContent = '清除数据';
            }
            
            // 更新文件名显示
            updateFileName(fileData.fileName);
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
    if (!file) return; // 如果没有选择文件，直接返回

    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
        alert('文件大小不能超过5MB');
        event.target.value = ''; // 清除文件选择
        return;
    }

    // 保存文件名
    const fileName = file.name;

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
                        processDataInWorker(sheet, fileName);  // 传递实际的文件名
                    } else {
                        processDataDirectly(sheet, fileName);  // 传递实际的文件名
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

    // 更新按钮状态（移到数据处理成功后）
    // hasData = true;
    // document.getElementById('dynamicButton').textContent = '清除数据';

    // 更新文件名显示（移到数据处理成功后）
    // updateFileName(file.name);
}

// 修改 Web Worker 处理函数
function processDataInWorker(sheet, fileName) {
    const worker = new Worker('dataWorker.js');
    
    worker.onmessage = function(e) {
        // 处理调试信息
        if (e.data.debug) {
            if (e.data.message === '工表范围:') {
                console.log('工作表范围:', e.data.range);
                console.log('总行数:', e.data.totalRows);
            }
            else if (e.data.message === '找到的列索引:') {
                console.log('列索引:', e.data.indexes);
                console.log('标题行:', e.data.titles);
                console.log('总列数:', e.data.totalColumns);
            }
            else if (e.data.message.startsWith('第')) {
                console.log(e.data.message, e.data.rowData);
            }
            else if (e.data.message === '数据处理调试:') {
                console.log('处理结果:', {
                    有效行数: e.data.rowCount,
                    总行数: e.data.totalRows,
                    样本数据: e.data.sampleData,
                    调试行数据: e.data.debugRows
                });
            }
            return;
        }

        if (e.data.error) {
            console.error('Excel处理错误:', e.data.error);
            alert('处理Excel文件时出错：\n' + e.data.error);
            document.getElementById('loading').style.display = 'none';
            return;
        }

        if (!e.data.debug && !e.data.error) {
            const processedData = e.data;
            if (!Array.isArray(processedData) || processedData.length === 0) {
                alert('未能读取到有效数据');
                document.getElementById('loading').style.display = 'none';
                return;
            }

            // 先更新数据
            currentData = processedData;
            originalData = [...processedData];
            filteredData = null;

            // 然后保存到本地存储
            saveToLocalStorage(processedData, fileName);
            
            // 显示数据
            displayPreview(processedData);
            document.getElementById('loading').style.display = 'none';
            
            // 最后更新UI状态
            hasData = true;
            const dynamicButton = document.getElementById('dynamicButton');
            if (dynamicButton) {
                dynamicButton.textContent = '清除数据';
            }
            updateFileName(fileName);
        }
    };

    worker.onerror = function(error) {
        console.error('Worker错误:', error);
        alert('处理文件时发生错误：' + (error.message || '未知误'));
        document.getElementById('loading').style.display = 'none';
    };

    worker.postMessage({
        sheet: sheet,
        columnIndexes: columnIndexes
    });
}

// 直接处理数据的函数（当不支持 Web Worker 时使用）
function processDataDirectly(sheet, fileName) {
    // 原有的数处理逻辑
    // ... 保持不变
}

// 修改displayPreview函数
function displayPreview(data) {
    // 检查是否需要更新国家按钮
    const countryButtons = document.getElementById('countryButtons');
    if (countryButtons) {
        const currentCountries = new Set(Array.from(countryButtons.querySelectorAll('.country-button'))
            .map(btn => btn.dataset.country)
            .filter(country => country !== 'all'));
        
        // 从新数据中获取国家列表
        const newCountries = new Set();
        data.forEach(row => {
            if (row.账号) {
                const match = String(row.账号).match(/-([^-]+)$/);
                if (match) {
                    newCountries.add(match[1].trim());
                }
            }
        });

        // 比较国家列表是否相同
        const needsUpdate = currentCountries.size === 0 || 
            currentCountries.size !== newCountries.size || 
            ![...newCountries].every(country => currentCountries.has(country));

        // 如果需要更新，重新创建国家按钮
        if (needsUpdate) {
            updateCountryOptions(data);
        }
    }
    
    // 显示数据
    displayData(data);
}

// 修改更新国家项的函数
function updateCountryOptions(data) {
    const countryButtons = document.getElementById('countryButtons');
    const countries = new Set();
    
    // 收集所有国家
    data.forEach(row => {
        if (row.账号) {
            const match = String(row.账号).match(/-([^-]+)$/);
            if (match) {
                countries.add(match[1].trim());
            }
        }
    });

    // 保存当前选中的国家
    const activeCountries = new Set(Array.from(countryButtons.querySelectorAll('.country-button.active'))
        .map(btn => btn.dataset.country));

    // 创建按钮
    countryButtons.innerHTML = `
        <button class="country-button ${activeCountries.has('all') ? 'active' : ''}" data-country="all">
            全部
        </button>
        ${Array.from(countries)
            .sort()
            .map(country => `
                <button class="country-button ${activeCountries.has(country) ? 'active' : ''}" data-country="${country}">
                    ${country}
                </button>
            `).join('')}
    `;

    // 添加点击事件
    const buttons = countryButtons.querySelectorAll('.country-button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const country = this.dataset.country;
            
            // 切换当前按钮的激状态
            this.classList.toggle('active');
            
            // 获取所有选中的按钮（包括"全部"按钮）
            const activeButtons = Array.from(countryButtons.querySelectorAll('.country-button.active'));
            const selectedCountries = activeButtons
                .map(btn => btn.dataset.country)
                .filter(c => c !== 'all');

            // 处理数据筛选
            if (country === 'all') {
                // 如果点击"全部"按钮
                if (this.classList.contains('active')) {
                    // 如果"全部"被激活，取消其他所有按钮的激活状态
                    buttons.forEach(btn => {
                        if (btn.dataset.country !== 'all') {
                            btn.classList.remove('active');
                        }
                    });
                    filteredData = null;
                }
            } else {
                // 如果点击具体国家按钮
                const allButton = countryButtons.querySelector('[data-country="all"]');
                
                // 如果有具体国家被选中，取消"全部"按钮的激活状态
                if (selectedCountries.length > 0) {
                    allButton.classList.remove('active');
                    
                    // 筛选中国家的数据
                    filteredData = currentData.filter(row => {
                        if (row.账号) {
                            const match = String(row.账号).match(/-([^-]+)$/);
                            if (match) {
                                return selectedCountries.includes(match[1].trim());
                            }
                        }
                        return false;
                    });
                } else {
                    // 如果没有具体国家被选中，激活"全部"按钮
                    allButton.classList.add('active');
                    filteredData = null;
                }
            }
            
            displayData(filteredData || currentData);
        });
    });
}

// 修改计算平均每天出单的逻辑
function calculateAverageDailySales(row) {
    // 确保正确解析数字，处理可能的字符串格式
    const inventory = parseFloat(String(row['可售库存']).replace(/,/g, '')) || 0;
    const transit = parseFloat(String(row['转运中']).replace(/,/g, '')) || 0;
    const receiving = parseFloat(String(row['在途库存-接收中']).replace(/,/g, '')) || 0;
    const estimatedDays = parseFloat(String(row['预估可售天数']).replace(/,/g, '')) || 0;
    
    // 计算总库存
    const totalInventory = inventory + transit + receiving;
    
    // 避免除以零
    if (estimatedDays <= 0) return 0;
    
    // 计算平均每天出单
    return totalInventory / estimatedDays;
}

// 将 updateTableContent 移到全局作用域
function updateTableContent(page) {
    if (!workingData) return;
    
    const table = document.getElementById('dataTable');
    const itemsPerPage = 20;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = workingData.slice(start, end);

    // 移除现有的数据行，保留表头
    const existingRows = table.querySelectorAll('tr:not(:first-child)');
    existingRows.forEach(row => row.remove());

    // 添加新的数据行
    pageData.forEach(row => {
        const tr = document.createElement('tr');
        
        headers.forEach(header => {
            const td = document.createElement('td');
            let value = row[header];
            
            // 处理产品标题，显示缩略版本
            if (header === '产品标题' && value) {
                td.title = value; // 保存完整标题作为悬浮提示
                value = value.length > 20 ? value.substring(0, 20) + '...' : value;
                td.style.textAlign = 'left'; // 文本左对齐
            }
            // 处理账号列，只显示国家部分
            else if (header === '账号' && value) {
                const match = String(value).match(/-([^-]+)$/);
                if (match) {
                    value = match[1].trim();
                }
                td.style.textAlign = 'left'; // 文本左对齐
            }
            // 处理 ASIN 列
            else if (header === 'ASIN') {
                td.style.textAlign = 'left'; // 文本左对齐
            }
            
            // 处理数值列
            if (numericColumns.includes(header)) {
                // 确保正确解析数字
                if (typeof value === 'string') {
                    value = parseFloat(value.replace(/,/g, '')) || 0;
                }
                
                if (header === '平均每天出单') {
                    value = calculateAverageDailySales(row);
                    row[header] = value; // 保存计算结果
                }
                else if (header === '在途库存可售天数') {
                    const avgDailySales = row['平均每天出单'] || calculateAverageDailySales(row);
                    const created = parseFloat(String(row['在途库存-已创建']).replace(/,/g, '')) || 0;
                    const shipped = parseFloat(String(row['���途库存-已发货']).replace(/,/g, '')) || 0;
                    
                    value = avgDailySales > 0 ? (created + shipped) / avgDailySales : 0;
                    row[header] = value; // 保存计算结果
                }
                else if (header === '需要补货数量') {
                    const estimatedDays = parseFloat(String(row['预估可售天数']).replace(/,/g, '')) || 0;
                    const avgDailySales = row['平均每天出单'] || calculateAverageDailySales(row);
                    const transitDays = row['在途库存可售天数'] || 0;
                    
                    value = Math.max(0, (targetDays - estimatedDays - transitDays) * avgDailySales);
                    row[header] = value; // 保存计算结果
                }

                // 设置数字单元格的显示格式
                td.dataset.type = 'number';
                if (header === '预估可售天数' || header === '平均每天出单' || header === '在途库存可售天数') {
                    td.textContent = value.toFixed(1);
                } else {
                    td.textContent = Math.round(value).toLocaleString('zh-CN');
                }
                td.style.textAlign = 'left'; // 确保数字单元格左对齐
            } else {
                td.textContent = value || '-';
            }
            
            // 所有单元格统一左对齐
            td.style.textAlign = 'left';
            
            // 添加内边距
            td.style.paddingLeft = '8px';
            td.style.paddingRight = '8px';
            
            tr.appendChild(td);
        });
        
        table.appendChild(tr);
    });

    // 更新分页
    updatePagination(page, Math.ceil(workingData.length / itemsPerPage));
}

// 将 updatePagination 移到全局作用域
function updatePagination(currentPage, totalPages) {
    const paginationDiv = document.querySelector('.pagination');
    if (!paginationDiv) return;
    
    let paginationHTML = '';
    
    // 上一页按钮
    paginationHTML += `
        <button class="page-button" ${currentPage === 1 ? 'disabled' : ''} 
                onclick="showPage(${currentPage - 1})">
            ←
        </button>
    `;
    
    // 页码按钮
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button class="page-button ${i === currentPage ? 'active' : ''}" 
                        onclick="showPage(${i})">
                    ${i}
                </button>
            `;
        }
    } else {
        // 显示部分页码
        let pages = [];
        if (currentPage <= 3) {
            pages = [1, 2, 3, 4, '...', totalPages];
        } else if (currentPage >= totalPages - 2) {
            pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        } else {
            pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
        }
        
        pages.forEach(page => {
            if (page === '...') {
                paginationHTML += `<span class="page-ellipsis">...</span>`;
            } else {
                paginationHTML += `
                    <button class="page-button ${page === currentPage ? 'active' : ''}" 
                            onclick="showPage(${page})">
                        ${page}
                    </button>
                `;
            }
        });
    }
    
    // 下一页按钮
    paginationHTML += `
        <button class="page-button" ${currentPage === totalPages ? 'disabled' : ''} 
                onclick="showPage(${currentPage + 1})">
            →
        </button>
    `;
    
    // 总记录数
    paginationHTML += `<span class="total-records">共 ${workingData.length} 条</span>`;
    
    paginationDiv.innerHTML = paginationHTML;
}

// 修改 displayData 函数，移除内部的 updatePagination 定义
function displayData(data) {
    workingData = filteredData || data;
    
    if (!Array.isArray(workingData) || workingData.length === 0) {
        console.error('无效的数据格式');
        return;
    }

    const table = document.getElementById('dataTable');
    if (!table) {
        console.error('找不到数据表格元素');
        return;
    }

    // 清除现有数据行
    const existingRows = table.querySelectorAll('tr:not(:first-child)');
    existingRows.forEach(row => row.remove());

    const oldPagination = document.querySelector('.pagination');
    if (oldPagination) {
        oldPagination.remove();
    }
    
    // 更新 headers，检查是否包含销量-上周列
    headers = workingData[0] && workingData[0].hasOwnProperty('销量-上周') ? 
        ['ASIN', '产品标题', '账号', '销量-上周', ...baseHeaders.slice(3)] : 
        [...baseHeaders];
    
    // 修改分页设置
    const itemsPerPage = 20; // 从50改为20
    const totalPages = Math.ceil(workingData.length / itemsPerPage);
    let currentPage = 1;

    function showPage(page) {
        console.log('开始显示页面:', page);
        console.log('当前排序状态:', sortState);

        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = workingData.slice(start, end);

        // 如果表格不存在，创建表格结构
        if (!table.querySelector('tr')) {
            // 创建表头行
            let headerRow = document.createElement('tr');
            
            // 添加表头
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                
                if (numericColumns.includes(header)) {
                    th.style.cursor = 'pointer';
                    th.dataset.column = header; // 添加数据属性以标识列
                    
                    th.addEventListener('click', () => {
                        // 检查数据是否存在
                        if (!originalData) {
                            console.warn('没有原始数据');
                            return;
                        }

                        // 移除所有表头的排序指示器
                        headerRow.querySelectorAll('th').forEach(th => {
                            th.textContent = th.dataset.column;
                        });
                        
                        // 更新排序状态
                        if (sortState.column === header) {
                            if (sortState.direction === 'asc') {
                                sortState.direction = 'desc';
                            } else if (sortState.direction === 'desc') {
                                // 第三次点击，重置排序状态和数据顺序
                                sortState.column = null;
                                sortState.direction = 'desc';
                                th.textContent = header; // 移除排序指示器
                                
                                // 恢复原始数据顺序
                                const activeCountryButtons = Array.from(document.querySelectorAll('.country-button.active'));
                                const selectedCountries = new Set(
                                    activeCountryButtons
                                        .map(btn => btn.dataset.country)
                                        .filter(c => c !== 'all')
                                );

                                // 如果选择了"全部"或没有选择任何国家，使用原始数据
                                if (selectedCountries.size === 0 || activeCountryButtons.some(btn => btn.dataset.country === 'all')) {
                                    workingData = [...originalData];
                                    filteredData = null;
                                } else {
                                    // 否则，根据选中的国家过滤原始数据
                                    workingData = originalData.filter(row => {
                                        if (!row.账号) return false;
                                        const match = String(row.账号).match(/-([^-]+)$/);
                                        return match && selectedCountries.has(match[1].trim());
                                    });
                                    filteredData = workingData;
                                }
                                
                                updateTableContent(1);
                                return;
                            }
                        } else {
                            sortState.column = header;
                            sortState.direction = 'asc';
                        }
                        
                        // 添加排序指示器
                        const arrow = sortState.direction === 'asc' ? ' ↑' : ' ↓';
                        th.textContent = header + arrow;
                        
                        // 排序数据
                        if (sortState.column) {
                            workingData = [...workingData].sort((a, b) => {
                                const valueA = parseFloat(String(a[header]).replace(/,/g, '')) || 0;
                                const valueB = parseFloat(String(b[header]).replace(/,/g, '')) || 0;
                                return sortState.direction === 'asc' ? valueA - valueB : valueB - valueA;
                            });
                        }

                        // 更新过滤状态
                        filteredData = workingData !== originalData ? workingData : null;
                        updateTableContent(1);
                    });
                }
                
                headerRow.appendChild(th);
            });
            
            table.appendChild(headerRow);
        }

        // 更新表格内容
        updateTableContent(page);
    }

    // 创建分页控件
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    table.parentElement.appendChild(paginationDiv);

    // 显示第一页数据
    showPage(1);
}

// 修改清除当前数据的函数
function clearAllData() {
    currentData = null;
    originalData = null;
    filteredData = null;
    localStorage.removeItem('currentData');
    
    // 清除表格和统计数据
    const table = document.getElementById('dataTable');
    const predictionResult = document.getElementById('predictionResult');
    const paginationDiv = document.querySelector('.pagination');
    const clearButton = document.getElementById('clearButton');
    const countryButtons = document.getElementById('countryButtons');
    const currentFileName = document.getElementById('currentFileName');
    
    if (table) table.innerHTML = '';
    if (predictionResult) predictionResult.innerHTML = '';
    if (paginationDiv) paginationDiv.remove();
    if (clearButton) clearButton.style.display = 'none';
    if (countryButtons) countryButtons.innerHTML = '';
    if (currentFileName) currentFileName.textContent = '';

    // 重置文件上传输入框
    const fileUpload = document.getElementById('fileUpload');
    if (fileUpload) {
        fileUpload.value = '';
    }

    // 重新创建历史UI（不会添加新记录，因为只是UI刷新）
    createFileHistoryUI();

    // 更新按钮状态
    hasData = false;
    const dynamicButton = document.getElementById('dynamicButton');
    if (dynamicButton) {
        dynamicButton.textContent = '导入Excel';
    }

    // 清除文件名显示
    updateFileName('');
}

// 修改文件名更新的相关函数
function updateFileName(fileName) {
    const currentFileName = document.getElementById('currentFileName');
    if (currentFileName) {
        currentFileName.textContent = fileName || '';
    }
} 
