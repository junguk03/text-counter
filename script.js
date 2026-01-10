// 텍스트 입력 요소
const textInput = document.getElementById('textInput');
const copyBtn = document.getElementById('copyBtn');
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

// 단일 청크 맞춤법 검사 함수
async function checkSpellingChunk(text, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch('https://m.search.naver.com/p/csearch/ocontent/spellchecker.nhn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `_callback=window.__jindo2_callback._spellingCheck_0&q=${encodeURIComponent(text)}`
            });

            const textResponse = await response.text();
            const jsonMatch = textResponse.match(/\((.+)\)/);

            if (!jsonMatch) {
                throw new Error('응답 파싱 실패');
            }

            const data = JSON.parse(jsonMatch[1]);

            if (data.message && data.message.result) {
                return data.message.result;
            }

            throw new Error('결과 없음');
        } catch (error) {
            if (i === retries - 1) throw error;
            // 재시도 전 대기 (500ms)
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// 텍스트를 500자씩 분할하는 함수 (문장 단위 고려)
function splitTextIntoChunks(text, maxLength = 500) {
    const chunks = [];
    let currentChunk = '';

    // 문장 단위로 분리 (마침표, 느낌표, 물음표 기준)
    const sentences = text.split(/([.!?]\s+)/);

    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];

        // 현재 청크에 추가했을 때 길이 초과 여부 확인
        if ((currentChunk + sentence).length > maxLength) {
            if (currentChunk.trim().length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                // 문장 자체가 500자를 넘는 경우 강제 분할
                chunks.push(sentence.substring(0, maxLength).trim());
                currentChunk = sentence.substring(maxLength);
            }
        } else {
            currentChunk += sentence;
        }
    }

    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

// 맞춤법 검사 함수 (최대 8000자 지원)
async function checkSpelling() {
    const text = textInput.value.trim();

    if (text.length === 0) {
        spellCheckResult.innerHTML = '<p class="error">텍스트를 입력해주세요.</p>';
        return;
    }

    if (text.length > 8000) {
        spellCheckResult.innerHTML = '<p class="warning">맞춤법 검사는 8000자까지만 가능합니다. 텍스트를 나누어 검사해주세요.</p>';
        return;
    }

    // 버튼 비활성화
    spellCheckBtn.disabled = true;
    spellCheckBtn.textContent = '검사 중...';

    // 텍스트를 500자씩 분할
    const chunks = splitTextIntoChunks(text, 500);

    spellCheckResult.innerHTML = `<p class="loading">맞춤법 검사 중... (${chunks.length}개 구간 처리 중)</p>`;

    try {
        let totalErrors = 0;
        let allErrors = [];
        let correctedChunks = [];

        // 각 청크를 순차적으로 검사 (병렬 처리 시 API 제한 가능)
        for (let i = 0; i < chunks.length; i++) {
            spellCheckResult.innerHTML = `<p class="loading">맞춤법 검사 중... (${i + 1}/${chunks.length} 구간 처리 중)</p>`;

            const result = await checkSpellingChunk(chunks[i]);

            if (result.errata_count > 0) {
                totalErrors += result.errata_count;
                // 각 오류에 청크 번호 추가
                result.errata.forEach(error => {
                    allErrors.push({
                        ...error,
                        chunkIndex: i + 1
                    });
                });
            }

            // 교정된 텍스트 저장 (HTML 태그 제거)
            const correctedText = result.html ? result.html.replace(/<\/?[^>]+(>|$)/g, '') : chunks[i];
            correctedChunks.push(correctedText);

            // API 요청 간격 조정 (500ms 대기)
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 결과 표시
        if (totalErrors === 0) {
            spellCheckResult.innerHTML = '<p class="success">✓ 맞춤법 오류가 발견되지 않았습니다!</p>';
        } else {
            let html = `<p class="info">총 ${totalErrors}개의 오류가 발견되었습니다:</p>`;
            html += '<div class="error-list">';

            allErrors.forEach((error, index) => {
                html += `
                    <div class="error-item">
                        <div class="error-number">${index + 1}</div>
                        <div class="error-content">
                            <div class="error-text">
                                <span class="wrong">${error.orgStr}</span>
                                <span class="arrow">→</span>
                                <span class="correct">${error.candWord}</span>
                            </div>
                            <div class="error-help">${error.help || ''} ${chunks.length > 1 ? `<span class="chunk-badge">[구간 ${error.chunkIndex}]</span>` : ''}</div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';

            // 전체 교정된 텍스트 표시
            const fullCorrectedText = correctedChunks.join(' ');
            html += `<div class="corrected-text"><strong>교정된 텍스트:</strong><br>${fullCorrectedText}</div>`;

            spellCheckResult.innerHTML = html;
        }

    } catch (error) {
        console.error('맞춤법 검사 오류:', error);
        spellCheckResult.innerHTML = `
            <p class="error">맞춤법 검사 중 오류가 발생했습니다.</p>
            <p class="info">네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.</p>
            <p class="info">대안: 다음 서비스를 이용해보세요:</p>
            <ul class="alternatives">
                <li><a href="http://speller.cs.pusan.ac.kr/" target="_blank">부산대 맞춤법 검사기</a></li>
                <li><a href="https://kornorms.korean.go.kr/regltn/regltnView.do?regltn_code=0003#a" target="_blank">국립국어원 한국어 어문 규정</a></li>
            </ul>
        `;
    } finally {
        // 버튼 다시 활성화
        spellCheckBtn.disabled = false;
        spellCheckBtn.textContent = '맞춤법 검사하기';
    }
}

// 텍스트 복사 함수
async function copyText() {
    const text = textInput.value;

    if (text.length === 0) {
        // 텍스트가 없을 때
        copyBtn.textContent = '⚠️ 텍스트 없음';
        copyBtn.classList.add('copied');
        setTimeout(() => {
            copyBtn.textContent = '📋 복사하기';
            copyBtn.classList.remove('copied');
        }, 1500);
        return;
    }

    try {
        // 클립보드에 복사
        await navigator.clipboard.writeText(text);

        // 성공 피드백
        copyBtn.textContent = '✓ 복사 완료!';
        copyBtn.classList.add('copied');

        // 1.5초 후 원래 텍스트로 복원
        setTimeout(() => {
            copyBtn.textContent = '📋 복사하기';
            copyBtn.classList.remove('copied');
        }, 1500);

    } catch (error) {
        // 구형 브라우저 대응: textarea를 선택하여 복사
        try {
            textInput.select();
            document.execCommand('copy');

            copyBtn.textContent = '✓ 복사 완료!';
            copyBtn.classList.add('copied');

            setTimeout(() => {
                copyBtn.textContent = '📋 복사하기';
                copyBtn.classList.remove('copied');
            }, 1500);

        } catch (fallbackError) {
            // 복사 실패
            copyBtn.textContent = '✗ 복사 실패';
            setTimeout(() => {
                copyBtn.textContent = '📋 복사하기';
            }, 1500);
        }
    }
}

// 전체 삭제 함수
function clearText() {
    if (textInput.value.length === 0) {
        return;
    }

    textInput.value = '';
    updateStats();
    spellCheckResult.innerHTML = '';
    textInput.focus();
}

// 이벤트 리스너
textInput.addEventListener('input', updateStats);
copyBtn.addEventListener('click', copyText);
clearBtn.addEventListener('click', clearText);
spellCheckBtn.addEventListener('click', checkSpelling);

// 페이지 로드 시 초기화
updateStats();
