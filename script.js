document.addEventListener('DOMContentLoaded', function() {
    // 元素引用
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const dropZone = document.getElementById('drop-zone');
    const previewImage = document.getElementById('preview-image');
    const uploadSection = document.getElementById('upload-section');
    const resultSection = document.getElementById('result-section');
    const loading = document.getElementById('loading');
    const resultContent = document.getElementById('result-content');
    const backButton = document.getElementById('back-button');
    
    // 寶可夢資料庫
    const pokemonDatabase = {
        names: ["皮卡丘", "卡比獸", "伊布", "胖丁", "卡咪龜", "妙蛙種子", "小火龍", "傑尼龜", "大蔥鴨", "果然翁"],
        skills: ["力氣強化S", "力氣強化M", "力氣強化L", "睡眠EXP增加S", "睡眠EXP增加M", "睡眠EXP增加L", 
                "料理強化S", "料理強化M", "料理強化L", "幫手獎勵S", "幫手獎勵M", "幫手獎勵L"],
        natures: ["孤僻", "勇敢", "大膽", "溫順", "慎重", "淘氣", "慵懶", "怕寂寞", "固執", "馬虎"]
    };
    
    // 綁定上傳按鈕
    uploadButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 監聽文件選擇
    fileInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            handleImageUpload(e.target.files[0]);
        }
    });
    
    // 拖放功能
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.style.backgroundColor = '#e6f7ff';
    });
    
    dropZone.addEventListener('dragleave', function() {
        dropZone.style.backgroundColor = '#f9f9f9';
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.style.backgroundColor = '#f9f9f9';
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageUpload(e.dataTransfer.files[0]);
        }
    });
    
    // 處理圖像上傳
    function handleImageUpload(file) {
        // 檢查是否為圖像
        if (!file.type.match('image.*')) {
            alert('請上傳圖像文件');
            return;
        }
        
        // 顯示預覽
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            dropZone.style.display = 'none';
            
            // 開始分析
            setTimeout(() => {
                uploadSection.style.display = 'none';
                resultSection.style.display = 'block';
                analyzeImage(previewImage);
            }, 500);
        };
        reader.readAsDataURL(file);
    }
    
    // 分析圖像
    async function analyzeImage(imageElement) {
        loading.style.display = 'block';
        resultContent.style.display = 'none';
        
        try {
            // 獲取圖像尺寸
            const imgWidth = imageElement.naturalWidth;
            const imgHeight = imageElement.naturalHeight;
            
            // 計算區域 (這些值需要根據實際截圖調整)
            const regions = {
                name: { x: Math.floor(imgWidth * 0.1), y: Math.floor(imgHeight * 0.15), 
                       width: Math.floor(imgWidth * 0.4), height: Math.floor(imgHeight * 0.06) },
                level: { x: Math.floor(imgWidth * 0.75), y: Math.floor(imgHeight * 0.15), 
                        width: Math.floor(imgWidth * 0.15), height: Math.floor(imgHeight * 0.06) },
                mainSkill: { x: Math.floor(imgWidth * 0.1), y: Math.floor(imgHeight * 0.3), 
                           width: Math.floor(imgWidth * 0.8), height: Math.floor(imgHeight * 0.08) }
            };
            
            // 創建 Canvas 分割區域
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 創建 Tesseract worker
            const worker = await Tesseract.createWorker('jpn+eng');
            
            // 識別寶可夢名稱
            canvas.width = regions.name.width;
            canvas.height = regions.name.height;
            ctx.drawImage(imageElement, 
                         regions.name.x, regions.name.y, regions.name.width, regions.name.height,
                         0, 0, canvas.width, canvas.height);
            
            const nameResult = await worker.recognize(canvas.toDataURL());
            const pokemonName = correctPokemonName(nameResult.data.text.trim());
            
            // 識別等級
            canvas.width = regions.level.width;
            canvas.height = regions.level.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageElement, 
                         regions.level.x, regions.level.y, regions.level.width, regions.level.height,
                         0, 0, canvas.width, canvas.height);
            
            await worker.setParameters({
                tessedit_char_whitelist: 'Lv.0123456789'
            });
            const levelResult = await worker.recognize(canvas.toDataURL());
            const levelText = levelResult.data.text.trim();
            const levelMatch = levelText.match(/(\d+)/);
            const level = levelMatch ? levelMatch[1] : "?";
            
            // 識別主技能
            canvas.width = regions.mainSkill.width;
            canvas.height = regions.mainSkill.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageElement, 
                         regions.mainSkill.x, regions.mainSkill.y, regions.mainSkill.width, regions.mainSkill.height,
                         0, 0, canvas.width, canvas.height);
            
            await worker.setParameters({});
            const skillResult = await worker.recognize(canvas.toDataURL());
            const mainSkill = findBestSkillMatch(skillResult.data.text.trim());
            
            // 終止 worker
            await worker.terminate();
            
            // 生成和顯示結果
            displayResults({
                name: pokemonName,
                level: level,
                mainSkill: mainSkill,
                rawText: {
                    name: nameResult.data.text,
                    level: levelResult.data.text,
                    skill: skillResult.data.text
                }
            });
            
        } catch (error) {
            console.error('分析錯誤:', error);
            resultContent.innerHTML = `<div class="error">分析失敗: ${error.message}</div>`;
            loading.style.display = 'none';
            resultContent.style.display = 'block';
        }
    }
    
    // 糾正寶可夢名稱
    function correctPokemonName(text) {
        if (!text) return "未識別";
        
        // 檢查完全匹配
        if (pokemonDatabase.names.includes(text)) {
            return text;
        }
        
        // 尋找最相似的名稱
        let bestMatch = "";
        let highestSimilarity = 0;
        
        for (const name of pokemonDatabase.names) {
            const similarity = calculateSimilarity(text, name);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = name;
            }
        }
        
        return highestSimilarity > 0.5 ? bestMatch : text;
    }
    
    // 尋找最匹配的技能
    function findBestSkillMatch(text) {
        if (!text) return "未識別";
        
        // 檢查是否包含任何技能名稱
        for (const skill of pokemonDatabase.skills) {
            if (text.includes(skill)) {
                return skill;
            }
        }
        
        // 尋找最相似的技能
        let bestMatch = "";
        let highestSimilarity = 0;
        
        for (const skill of pokemonDatabase.skills) {
            const similarity = calculateSimilarity(text, skill);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = skill;
            }
        }
        
        return highestSimilarity > 0.5 ? bestMatch : "未識別技能";
    }
    
    // 計算字符串相似度
    function calculateSimilarity(str1, str2) {
        str1 = str1.toLowerCase().replace(/\s+/g, '');
        str2 = str2.toLowerCase().replace(/\s+/g, '');
        
        if (str1 === str2) return 1.0;
        if (str1.length < 2 || str2.length < 2) return 0.0;
        
        // 簡單的相似度計算
        let matchCount = 0;
        for (let i = 0; i < str1.length; i++) {
            if (str2.includes(str1[i])) matchCount++;
        }
        
        return matchCount / Math.max(str1.length, str2.length);
    }
    
    // 顯示結果
    function displayResults(data) {
        let resultHTML = `
            <div class="result-card">
                <h3>識別結果</h3>
                <div class="data-row">
                    <span class="data-label">寶可夢:</span>
                    <span>${data.name}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">等級:</span>
                    <span>${data.level}</span>
                </div>
                <div class="data-row">
                    <span class="data-label">主要技能:</span>
                    <span>${data.mainSkill}</span>
                </div>
                
                <h3>原始識別文本</h3>
                <div class="raw-text">名稱區域: ${data.rawText.name}
等級區域: ${data.rawText.level}
技能區域: ${data.rawText.skill}</div>
            </div>
        `;
        
        resultContent.innerHTML = resultHTML;
        loading.style.display = 'none';
        resultContent.style.display = 'block';
    }
    
    // 返回按鈕
    backButton.addEventListener('click', function() {
        // 重置界面
        resultSection.style.display = 'none';
        uploadSection.style.display = 'block';
        previewImage.style.display = 'none';
        dropZone.style.display = 'flex';
        fileInput.value = '';
    });
});
