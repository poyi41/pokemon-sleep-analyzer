document.addEventListener('DOMContentLoaded', function() {
    // 元素引用
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const dropZone = document.getElementById('drop-zone');
    const previewImage = document.getElementById('preview-image');
    const uploadSection = document.getElementById('upload-section');
    const resultSection = document.getElementById('result-section');
    const loading = document.getElementById('loading');
    const progressIndicator = document.getElementById('progress-indicator');
    const resultContent = document.getElementById('result-content');
    const backButton = document.getElementById('back-button');
    
    // 寶可夢資料庫
    const pokemonDatabase = {
        names: ["皮卡丘", "卡比獸", "伊布", "胖丁", "卡咪龜", "妙蛙種子", "小火龍", "傑尼龜", "大蔥鴨", 
                "果然翁", "大岩蛇", "克雷色利亞", "迷你龍", "迷你尼", "迷你莉", "迷你多", "迷擬Q", "快龍",
                "妙蛙花", "噴火龍", "水箭龜", "超夢", "路卡利歐", "耿鬼", "卡璞・鳴鳴", "洛奇亞", "夢幻"],
        skills: ["力氣強化S", "力氣強化M", "力氣強化L", "睡眠EXP增加S", "睡眠EXP增加M", "睡眠EXP增加L", 
                "料理強化S", "料理強化M", "料理強化L", "幫手獎勵S", "幫手獎勵M", "幫手獎勵L",
                "食材獲取S", "食材獲取M", "食材獲取L", "新月祈禱", "活力填充S", "活力填充M", "活力填充L", 
                "持有上限提升S", "持有上限提升M", "持有上限提升L",
                "幫手獎勵", "睡眠EXP獎勵", "技能等級提升S", "技能等級提升M", "技能等級提升L",
                "幫忙速度S", "幫忙速度M", "幫忙速度L", "技能機率提升S", "食材機率提升S"],
        natures: ["自大", "勤奮", "勇敢", "溫順", "怕寂寞", "固執", "頑皮", "慢吞吞", "冷靜", "害羞", 
                 "馬虎", "溫和", "慎重", "淘氣", "內斂", "悠閒", "坦率", "憂郁", "大膽", "溫和", "天真"]
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
        progressIndicator.style.width = '0%';
        
        try {
            // 獲取圖像尺寸
            const imgWidth = imageElement.naturalWidth;
            const imgHeight = imageElement.naturalHeight;
            
            // 計算區域
            const regions = {
                // 紅框區域 - 包含寶可夢名稱、等級和SP值
                pokemonInfo: { 
                    x: Math.floor(imgWidth * 0.05), 
                    y: Math.floor(imgHeight * 0.1), 
                    width: Math.floor(imgWidth * 0.9), 
                    height: Math.floor(imgHeight * 0.08) 
                },
                
                // 主技能區域 - 黃色框內
                mainSkill: { 
                    x: Math.floor(imgWidth * 0.05), 
                    y: Math.floor(imgHeight * 0.32), 
                    width: Math.floor(imgWidth * 0.9), 
                    height: Math.floor(imgHeight * 0.1) 
                },
                
                // 性格區域
                nature: { 
                    x: Math.floor(imgWidth * 0.1), 
                    y: Math.floor(imgHeight * 0.65), 
                    width: Math.floor(imgWidth * 0.3), 
                    height: Math.floor(imgHeight * 0.06) 
                },
                
                // 幫忙間隔區域
                interval: {
                    x: Math.floor(imgWidth * 0.5),
                    y: Math.floor(imgHeight * 0.18),
                    width: Math.floor(imgWidth * 0.45),
                    height: Math.floor(imgHeight * 0.06)
                },
                
                // 持有上限區域
                capacity: {
                    x: Math.floor(imgWidth * 0.5),
                    y: Math.floor(imgHeight * 0.25),
                    width: Math.floor(imgWidth * 0.3),
                    height: Math.floor(imgHeight * 0.06)
                }
            };
            
            // 創建 Canvas 分割區域
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 創建 Tesseract worker
            const worker = await Tesseract.createWorker('jpn+eng+chi_tra');
            
            // 結果對象
            const results = {
                rawText: {}
            };
            
            // 更新進度
            progressIndicator.style.width = '20%';
            
            // 識別寶可夢基本信息 (名稱、等級、SP值)
            canvas.width = regions.pokemonInfo.width;
            canvas.height = regions.pokemonInfo.height;
            ctx.drawImage(imageElement, 
                         regions.pokemonInfo.x, regions.pokemonInfo.y, 
                         regions.pokemonInfo.width, regions.pokemonInfo.height,
                         0, 0, canvas.width, canvas.height);
            
            const infoResult = await worker.recognize(canvas.toDataURL());
            results.rawText.info = infoResult.data.text.trim();
            
            // 解析寶可夢信息
            const pokemonInfo = parsePokemonInfo(results.rawText.info);
            results.pokemonName = pokemonInfo.name;
            results.level = pokemonInfo.level;
            results.sp = pokemonInfo.sp;
            
            // 更新進度
            progressIndicator.style.width = '40%';
            
            // 識別主技能
            canvas.width = regions.mainSkill.width;
            canvas.height = regions.mainSkill.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageElement, 
                         regions.mainSkill.x, regions.mainSkill.y, 
                         regions.mainSkill.width, regions.mainSkill.height,
                         0, 0, canvas.width, canvas.height);
            
            const skillResult = await worker.recognize(canvas.toDataURL());
            results.rawText.skill = skillResult.data.text.trim();
            results.mainSkill = findBestSkillMatch(results.rawText.skill);
            
            // 更新進度
            progressIndicator.style.width = '60%';
            
            // 識別性格
            canvas.width = regions.nature.width;
            canvas.height = regions.nature.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageElement, 
                         regions.nature.x, regions.nature.y, 
                         regions.nature.width, regions.nature.height,
                         0, 0, canvas.width, canvas.height);
            
            const natureResult = await worker.recognize(canvas.toDataURL());
            results.rawText.nature = natureResult.data.text.trim();
            results.nature = findBestNatureMatch(results.rawText.nature);
            
            // 更新進度
            progressIndicator.style.width = '80%';
            
            // 識別幫忙間隔
            canvas.width = regions.interval.width;
            canvas.height = regions.interval.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageElement, 
                         regions.interval.x, regions.interval.y, 
                         regions.interval.width, regions.interval.height,
                         0, 0, canvas.width, canvas.height);
            
            const intervalResult = await worker.recognize(canvas.toDataURL());
            results.rawText.interval = intervalResult.data.text.trim();
            results.interval = parseInterval(results.rawText.interval);
            
            // 識別持有上限
            canvas.width = regions.capacity.width;
            canvas.height = regions.capacity.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageElement, 
                         regions.capacity.x, regions.capacity.y, 
                         regions.capacity.width, regions.capacity.height,
                         0, 0, canvas.width, canvas.height);
            
            const capacityResult = await worker.recognize(canvas.toDataURL());
            results.rawText.capacity = capacityResult.data.text.trim();
            results.capacity = parseCapacity(results.rawText.capacity);
            
            // 更新進度
            progressIndicator.style.width = '100%';
            
            // 終止 worker
            await worker.terminate();
            
            // 生成和顯示結果
            displayResults(results);
            
        } catch (error) {
            console.error('分析錯誤:', error);
            resultContent.innerHTML = `<div class="error">分析失敗: ${error.message}</div>`;
            loading.style.display = 'none';
            resultContent.style.display = 'block';
        }
    }
    
    // 解析寶可夢基本信息
    function parsePokemonInfo(text) {
        // 尋找 SP 值
        const spMatch = text.match(/SP\s*(\d+,?\d*)/i);
        // 尋找等級
        const lvMatch = text.match(/Lv\.?\s*(\d+)/i);
        
        // 移除SP和Lv部分，剩下的可能是寶可夢名稱
        let nameText = text
            .replace(/SP\s*\d+,?\d*/i, '')
            .replace(/Lv\.?\s*\d+/i, '')
            .trim();
        
        return {
            name: nameText ? correctPokemonName(nameText) : "未識別",
            level: lvMatch ? lvMatch[1] : "?",
            sp: spMatch ? spMatch[1].replace(',', '') : "?"
        };
    }
    
    // 解析幫忙間隔
    function parseInterval(text) {
        // 尋找時間格式，如 "每49分36秒" 或 "每1小時13分3秒"
        const hourMatch = text.match(/每(\d+)小時/);
        const minuteMatch = text.match(/每?(\d+)分/);
        const secondMatch = text.match(/(\d+)秒/);
        
        let interval = "";
        
        if (hourMatch) {
            interval += `${hourMatch[1]}小時`;
        }
        
        if (minuteMatch) {
            interval += `${minuteMatch[1]}分`;
        }
        
        if (secondMatch) {
            interval += `${secondMatch[1]}秒`;
        }
        
        return interval || "未識別";
    }
    
    // 解析持有上限
    function parseCapacity(text) {
        // 尋找數字，如 "40個" 或 "9個"
        const match = text.match(/(\d+)[個|个]/);
        return match ? match[1] : "未識別";
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
    
    // 尋找最匹配的性格
    function findBestNatureMatch(text) {
        if (!text) return "未識別";
        
        // 檢查完全匹配
        if (pokemonDatabase.natures.includes(text)) {
            return text;
        }
        
        // 尋找最相似的性格
        let bestMatch = "";
        let highestSimilarity = 0;
        
        for (const nature of pokemonDatabase.natures) {
            const similarity = calculateSimilarity(text, nature);
            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = nature;
            }
        }
        
        return highestSimilarity > 0.5 ? bestMatch : text;
    }
    
    // 計算字符串相似度
    function calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
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
                <div class="card-header">
                    <h3>寶可夢基本信息</h3>
                </div>
                <div class="card-body">
                    <div class="data-row">
                        <span class="data-label">寶可夢:</span>
                        <span>${data.pokemonName}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">等級:</span>
                        <span>Lv.${data.level}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">SP值:</span>
                        <span class="sp-value">${data.sp}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">主要技能:</span>
                        <span><span class="skill-tag">${data.mainSkill}</span></span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">性格:</span>
                        <span><span class="nature-tag">${data.nature}</span></span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">幫忙間隔:</span>
                        <span>${data.interval}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">持有上限:</span>
                        <span>${data.capacity}個</span>
                    </div>
                </div>
            </div>
            
            <div class="result-card">
                <div class="card-header">
                    <h3>原始識別文本</h3>
                </div>
                <div class="card-body">
                    <div class="raw-text">基本信息區域: ${data.rawText.info}
技能區域: ${data.rawText.skill}
性格區域: ${data.rawText.nature}
幫忙間隔區域: ${data.rawText.interval}
持有上限區域: ${data.rawText.capacity}</div>
                </div>
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
