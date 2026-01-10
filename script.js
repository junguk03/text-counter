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

// 맞춤법 검사 (외부 사이트 열기)
async function checkSpelling() {
    const text = textInput.value.trim();

    if (text.length === 0) {
        spellCheckResult.innerHTML = '<p class="error">텍스트를 입력해주세요.</p>';
        return;
    }

    try {
        // 텍스트 복사
        await navigator.clipboard.writeText(text);

        // 안내 메시지 표시
        spellCheckResult.innerHTML = `
            <p class="success">✓ 텍스트가 클립보드에 복사되었습니다!</p>
            <p class="info">맞춤법 검사 사이트에서 <strong>Ctrl+V</strong> (또는 Command+V)로 붙여넣으세요.</p>
        `;

        // 부산대 맞춤법 검사 사이트 새 창으로 열기
        window.open('http://speller.cs.pusan.ac.kr/', '_blank');

    } catch (error) {
        // 복사 실패 시 폴백
        try {
            textInput.select();
            document.execCommand('copy');

            spellCheckResult.innerHTML = `
                <p class="success">✓ 텍스트가 복사되었습니다!</p>
                <p class="info">맞춤법 검사 사이트에서 <strong>Ctrl+V</strong> (또는 Command+V)로 붙여넣으세요.</p>
            `;

            window.open('http://speller.cs.pusan.ac.kr/', '_blank');

        } catch (fallbackError) {
            // 복사도 실패한 경우
            spellCheckResult.innerHTML = `
                <p class="warning">텍스트 복사에 실패했습니다.</p>
                <p class="info">수동으로 텍스트를 복사한 후 아래 사이트를 이용해주세요:</p>
                <ul class="alternatives">
                    <li><a href="http://speller.cs.pusan.ac.kr/" target="_blank">부산대 맞춤법 검사기</a></li>
                    <li><a href="https://kornorms.korean.go.kr/regltn/regltnView.do?regltn_code=0003#a" target="_blank">국립국어원 한국어 어문 규정</a></li>
                </ul>
            `;
        }
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
