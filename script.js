// 텍스트 입력 요소
const textInput = document.getElementById('textInput');
const clearBtn = document.getElementById('clearBtn');
const spellCheckBtn = document.getElementById('spellCheckBtn');
const spellCheckResult = document.getElementById('spellCheckResult');

// 통계 요소
const charCount = document.getElementById('charCount');
const charCountNoSpace = document.getElementById('charCountNoSpace');
const wordCount = document.getElementById('wordCount');
const sentenceCount = document.getElementById('sentenceCount');
const lineCount = document.getElementById('lineCount');

// 글자수 세기 함수
function updateStats() {
    const text = textInput.value;

    // 글자수 (공백 포함)
    charCount.textContent = text.length.toLocaleString();

    // 글자수 (공백 제외)
    const noSpaceText = text.replace(/\s/g, '');
    charCountNoSpace.textContent = noSpaceText.length.toLocaleString();

    // 단어수 (한글, 영어 모두 지원)
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    wordCount.textContent = words.length.toLocaleString();

    // 문장수 (마침표, 느낌표, 물음표 기준)
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    sentenceCount.textContent = sentences.length.toLocaleString();

    // 줄 수
    const lines = text.split('\n').filter(line => line.length > 0);
    lineCount.textContent = lines.length.toLocaleString();
}

// 맞춤법 검사 함수 (네이버 맞춤법 검사 API 사용)
async function checkSpelling() {
    const text = textInput.value.trim();

    if (text.length === 0) {
        spellCheckResult.innerHTML = '<p class="error">텍스트를 입력해주세요.</p>';
        return;
    }

    if (text.length > 500) {
        spellCheckResult.innerHTML = '<p class="warning">맞춤법 검사는 500자까지만 가능합니다. 텍스트를 나누어 검사해주세요.</p>';
        return;
    }

    spellCheckResult.innerHTML = '<p class="loading">맞춤법 검사 중...</p>';

    try {
        // 네이버 맞춤법 검사 API 사용 (CORS 문제로 프록시 사용)
        const response = await fetch('https://m.search.naver.com/p/csearch/ocontent/spellchecker.nhn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `_callback=window.__jindo2_callback._spellingCheck_0&q=${encodeURIComponent(text)}`
        });

        const textResponse = await response.text();

        // JSONP 응답 파싱
        const jsonMatch = textResponse.match(/\((.+)\)/);
        if (!jsonMatch) {
            throw new Error('응답 파싱 실패');
        }

        const data = JSON.parse(jsonMatch[1]);

        if (data.message && data.message.result) {
            const result = data.message.result;

            if (result.errata_count === 0) {
                spellCheckResult.innerHTML = '<p class="success">✓ 맞춤법 오류가 발견되지 않았습니다!</p>';
            } else {
                let html = `<p class="info">총 ${result.errata_count}개의 오류가 발견되었습니다:</p>`;
                html += '<div class="error-list">';

                result.errata.forEach((error, index) => {
                    html += `
                        <div class="error-item">
                            <div class="error-number">${index + 1}</div>
                            <div class="error-content">
                                <div class="error-text">
                                    <span class="wrong">${error.orgStr}</span>
                                    <span class="arrow">→</span>
                                    <span class="correct">${error.candWord}</span>
                                </div>
                                <div class="error-help">${error.help || ''}</div>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';
                html += `<div class="corrected-text"><strong>교정된 텍스트:</strong><br>${result.html}</div>`;
                spellCheckResult.innerHTML = html;
            }
        } else {
            throw new Error('결과 없음');
        }

    } catch (error) {
        console.error('맞춤법 검사 오류:', error);
        spellCheckResult.innerHTML = `
            <p class="error">맞춤법 검사 중 오류가 발생했습니다.</p>
            <p class="info">대안: 다음 서비스를 이용해보세요:</p>
            <ul class="alternatives">
                <li><a href="http://speller.cs.pusan.ac.kr/" target="_blank">부산대 맞춤법 검사기</a></li>
                <li><a href="https://kornorms.korean.go.kr/regltn/regltnView.do?regltn_code=0003#a" target="_blank">국립국어원 한국어 어문 규정</a></li>
            </ul>
        `;
    }
}

// 전체 삭제 함수
function clearText() {
    textInput.value = '';
    updateStats();
    spellCheckResult.innerHTML = '';
}

// 이벤트 리스너
textInput.addEventListener('input', updateStats);
clearBtn.addEventListener('click', clearText);
spellCheckBtn.addEventListener('click', checkSpelling);

// 페이지 로드 시 초기화
updateStats();
