document.getElementById('fileUpload').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxSize) {
        alert('文件大小不能超过5MB');
        return;
    }

    // 验证文件类型
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type)) {
        alert('请上传有效的Excel文件（.xlsx 或 .xls）');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        // 获取第一个工作表
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 将工作表转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // 显示数据预览
        displayPreview(jsonData);
        
        // 进行预测计算
        calculatePrediction(jsonData);
    };

    reader.readAsArrayBuffer(file);
}

function displayPreview(data) {
    const table = document.getElementById('dataTable');
    table.innerHTML = '';

    // 创建表头
    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // 添加数据行
    data.slice(0, 5).forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header];
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

function calculatePrediction(data) {
    // 这里可以添加你的预测逻辑
    // 示例：简单地计算平均发货时间
    const predictionResult = document.getElementById('predictionResult');
    
    // 假设数据中有"发货时间"字段
    const avgShippingTime = data.reduce((acc, curr) => {
        return acc + (curr['发货时间'] || 0);
    }, 0) / data.length;

    predictionResult.innerHTML = `
        <p>基于历史数据的预测结果：</p>
        <p>平均发货时间：${avgShippingTime.toFixed(2)} 天</p>
    `;
} 
