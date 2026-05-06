// State
let palmData = null;
let stream = null;
let capturedPalmImage = null;

// DOM Elements
const video = document.getElementById('camera-video');
const canvas = document.getElementById('camera-canvas');
const ctx = canvas.getContext('2d');
const btnStartCamera = document.getElementById('btn-start-camera');
const imageUpload = document.getElementById('image-upload');
const cameraContainer = document.querySelector('.camera-container');
const placeholder = document.getElementById('camera-placeholder');
const statusMsg = document.getElementById('palm-status');

// Step Navigation
function nextStep(stepIndex) {
    // If moving from step 3 to 4, ensure palm has been scanned
    if (stepIndex === 4 && !palmData) {
        statusMsg.innerText = "手相を読み取るか、画像をアップロードしてください。";
        statusMsg.style.color = "#ff5555";
        return;
    }

    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${stepIndex}`).classList.add('active');
}

function prevStep(stepIndex) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${stepIndex}`).classList.add('active');
}

// Camera Operations
btnStartCamera.addEventListener('click', async () => {
    if (stream) {
        // Stop camera and capture
        captureImage();
        return;
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        canvas.style.display = 'none';
        btnStartCamera.innerText = 'スキャン開始 (撮影)';
        statusMsg.innerText = "手のひらをカメラに向けてください...";
        statusMsg.style.color = "#a0a0c0";
    } catch (err) {
        console.error("Camera error:", err);
        statusMsg.innerText = "カメラの起動に失敗しました。画像アップロードをご利用ください。";
        statusMsg.style.color = "#ff5555";
    }
});

function captureImage() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Stop stream
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    
    video.style.display = 'none';
    canvas.style.display = 'block';
    btnStartCamera.innerText = 'カメラ再起動';
    
    capturedPalmImage = canvas.toDataURL('image/jpeg');
    analyzePalm(capturedPalmImage);
}

// Image Upload
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        btnStartCamera.innerText = 'カメラ起動';
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            video.style.display = 'none';
            placeholder.style.display = 'none';
            canvas.style.display = 'block';
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            capturedPalmImage = canvas.toDataURL('image/jpeg');
            analyzePalm(capturedPalmImage);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Analyze Palm via Python Backend
async function analyzePalm(base64Image) {
    statusMsg.innerText = "星の軌跡（シワ）を読み取っています...";
    statusMsg.style.color = "var(--cyan)";
    cameraContainer.classList.add('scan-active');
    btnStartCamera.disabled = true;

    try {
        const response = await fetch('http://localhost:5000/analyze-palm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: base64Image })
        });

        const result = await response.json();
        cameraContainer.classList.remove('scan-active');
        btnStartCamera.disabled = false;

        if (result.success) {
            palmData = result.palm_type;
            statusMsg.innerText = "手相の読み取りが完了しました！次へ進んでください。";
            statusMsg.style.color = "var(--gold)";
        } else {
            statusMsg.innerText = "読み取りエラー: " + result.error;
            statusMsg.style.color = "#ff5555";
            palmData = null;
        }
    } catch (err) {
        console.error("API error:", err);
        cameraContainer.classList.remove('scan-active');
        btnStartCamera.disabled = false;
        statusMsg.innerText = "サーバーに接続できません。Pythonサーバーが起動しているか確認してください。";
        statusMsg.style.color = "#ff5555";
        palmData = null;
    }
}

// Result Calculation
function calculateResult() {
    // 1. Show Loading Screen
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById('step-loading').classList.add('active');

    // 2. Gather Data from inputs
    const data = {
        name: document.getElementById('user-name').value || "名無し",
        dob: document.getElementById('dob').value,
        birthplace: document.getElementById('birthplace').value || "秘密",
        blood: document.getElementById('blood-type').value,
        gender: document.getElementById('gender').options[document.getElementById('gender').selectedIndex].text,
        height: document.getElementById('height').value || "―",
        weight: document.getElementById('weight').value || "―",
        faculty: document.getElementById('faculty').value || "秘密",
        mbti: document.getElementById('mbti').value,
        siblings: document.getElementById('siblings').value,
        loveMbti: document.getElementById('love-mbti').value,
        holiday: document.getElementById('holiday').value,
        palmType: palmData || "standard",
        qChoice: document.getElementById('q-choice').value,
        hobbies: document.getElementById('hobbies').value || "特になし",
        dislikes: document.getElementById('dislikes').value || "特になし",
    };

    // 3. Generate Diagnosis
    setTimeout(() => {
        generateFortune(data);
        document.getElementById('step-loading').classList.remove('active');
        document.getElementById('step-result').classList.add('active');
    }, 2500);
}

// Fortune-telling Algorithm Logic
function generateFortune(data) {
    const titles = [
        "【情熱の紅蓮星】", "【静寂の蒼月】", "【自由を愛する風の精霊】", 
        "【癒しを導く泉の女神】", "【知性を司る白銀の賢者】", "【運命を切り開く黄金の太陽】"
    ];
    
    const hashStr = data.mbti + data.blood + data.palmType + data.qChoice + data.dob;
    let hash = 0;
    for (let i = 0; i < hashStr.length; i++) {
        hash += hashStr.charCodeAt(i);
    }
    
    const titleIndex = hash % titles.length;
    const title = titles[titleIndex];

    // --- Generate Description ---
    let desc = "";
    
    // 生年月日による星回り
    if (data.dob) {
        const dateObj = new Date(data.dob);
        const month = dateObj.getMonth() + 1;
        
        if (month === 3 || month === 4) desc += "あなたは芽吹きの季節に生まれたことで、内面に強い生命力と好奇心を秘めています。";
        else if (month === 5 || month === 6) desc += "初夏の風のように爽やかで、周囲の人に安心感と笑顔をもたらす天性のムードメーカーです。";
        else if (month === 7 || month === 8) desc += "真夏の太陽のエネルギーを宿しており、一度決めた目標には周囲を巻き込んで突き進む圧倒的な熱量を持っています。";
        else if (month === 9 || month === 10) desc += "秋の夜長のように思慮深く、物事の表面だけでなく本質を見抜く鋭い洞察力に優れています。";
        else if (month === 11 || month === 12) desc += "澄み切った冬の空のような純粋さと、ブレない強い芯を持った、ミステリアスな魅力の持ち主です。";
        else desc += "冬から春へと向かう力強い時期に生まれ、困難を乗り越えて独自の道を切り拓く開拓者の魂を持っています。";
    }

    desc += `\n\nまた、「${data.mbti}」の思考パターンと、「${data.blood}型」の気質が深く交わっている点があなたの最大の特徴です。`;
    
    // MBTIの分解解説
    const mbtiTraits = {
        "I": "自分の内なる世界を大切にし、", "E": "外部とのコミュニケーションからエネルギーを得て、",
        "N": "直感と理想を追求し、", "S": "現実的で具体的な事実を重んじ、",
        "T": "論理的かつ合理的な判断を下し、", "F": "人の感情や調和を最優先に考え、",
        "J": "計画的で秩序立った行動を好み、", "P": "柔軟で臨機応変な対応を得意とする、"
    };
    if(data.mbti && data.mbti.length === 4) {
        desc += `\n${mbtiTraits[data.mbti[0]]}${mbtiTraits[data.mbti[1]]}${mbtiTraits[data.mbti[2]]}${mbtiTraits[data.mbti[3]]}非常に個性的で奥深い人物像が浮かび上がります。`;
    }

    if (data.faculty) {
        desc += `\nさらに「${data.faculty}」の分野で培った専門知識や思考プロセスが、無意識の行動基準となっています。これが恋愛においても『相手を深く分析する力』や『論理的に問題を解決する力』として表れ、一般的な感情論だけの恋愛とは一線を画す、成熟した大人の関係を築く土台となっています。`;
    }

    desc += `\n\n【恋愛傾向の深掘り】\n`;
    if (data.loveMbti === "romantic") desc += "あなたは「運命」や「奇跡的な出会い」を信じる純粋なロマンチストです。記念日を大切にし、日常の中に映画のようなドラマティックな瞬間を創り出す才能があります。相手を喜ばせるためのサプライズを考えるのが得意です。";
    else if (data.loveMbti === "pragmatic") desc += "あなたは一時的な感情に流されない、極めて現実主義的な恋愛観を持っています。相手の金銭感覚、生活リズム、将来のビジョンが合うかどうかを慎重に見極めるため、一度付き合えば結婚までスムーズに進む安定感があります。";
    else if (data.loveMbti === "passionate") desc += "あなたは好きになった瞬間にすべてを懸ける情熱的なタイプです。駆け引きを嫌い、ストレートに愛情を表現するため、相手はあなたの真っ直ぐな想いに強く心を打たれるでしょう。恋の炎が燃え上がるスピードは誰よりも早いです。";
    else if (data.loveMbti === "cautious") desc += "あなたは非常に慎重で、相手が本当に信頼できる人物かどうかを時間をかけて見極めます。簡単に心を開かない分、一度心を開いた相手には絶対的な信頼と深い愛情を注ぐ、決して裏切りのない一途なタイプです。";
    else if (data.loveMbti === "devoted") desc += "あなたは愛する人の笑顔を見ることに最大の喜びを感じる尽くし型です。相手の好みを把握し、見返りを求めずにサポートするその献身的な姿勢は、多くの人の心を癒やし、相手にとって手放せない存在となります。";
    else desc += "あなたは恋愛においても「個の確立」を最重要視します。お互いに依存しすぎず、別々の趣味や時間を持つことを尊重できるため、束縛を嫌う人にとって最高のパートナーです。風通しの良い、成熟したパートナーシップを築けます。";


    // --- Generate Palm Description ---
    let palmDesc = "";
    if (data.palmType === "complex") {
        palmDesc = "【線の密度: 高（複雑）】\n手相に細かい線が網の目のように多数検出されました。これは、あなたが非常に高いアンテナを持ち、人の感情の機微や場の空気を瞬時に察知する「超・共感型」であることを示しています。\n相手が言葉にしなくても「今、何を求めているか」がわかってしまうため気疲れしやすい面もありますが、その圧倒的な優しさと気配りによって、パートナーからは深く愛されます。";
    } else if (data.palmType === "strong") {
        palmDesc = "【線の濃さ・長さ: 強】\n深く刻まれた、はっきりとした強い線が検出されました。これは、あなたの運命を切り開く自己主張の強さと、強靭なメンタルの表れです。\n恋愛においても、障害があればあるほど燃え上がり、絶対に諦めない一途さを持っています。自分が主導権を握ることで関係がスムーズに進みやすく、相手を力強く引っ張っていく頼もしい存在です。";
    } else if (data.palmType === "simple") {
        palmDesc = "【線の密度: 低（シンプル）】\n余分な線が少なく、主要な線だけがスッキリと刻まれた美しい手相です。これは、物事を複雑にこじらせず、非常に合理的でサッパリとした性格を表しています。\n過去の失敗に執着せず、常に「今」と「未来」を見て生きているため、恋愛においてもネチネチした喧嘩になりません。風通しの良い、爽やかな関係を好む証拠です。";
    } else {
        palmDesc = "【バランス型】\n線が過不足なく、非常にバランスの取れた標準的な手相が検出されました。これは、あなたが理性と感情のコントロールに長けており、どんなタイプの相手にも柔軟に合わせられる高い適応能力を持っていることを示します。\n波乱万丈なドラマよりも、日々のささやかな幸せを大切にする、長期的なパートナーシップや結婚向きの穏やかな手相です。";
    }

    // --- Generate Partner Compatibility ---
    let partner = "";
    partner += "【あなたと最高の相性を持つ人物像】\n";
    if (data.qChoice === "peace") {
        partner += "最も重要なのは「沈黙が苦にならない安心感」です。休日にただ同じ部屋で別々のことをしていても、全く気を遣わない相手。感情の起伏が少なく、穏やかな声で話す人と一緒にいると、あなたの運気は最大化されます。";
    } else if (data.qChoice === "excitement") {
        partner += "最も重要なのは「常に新しい世界を見せてくれる刺激」です。多趣味で行動力があり、突然『明日旅行に行こう』と提案してくるような、予測不能でワクワクさせてくれる相手が運命のパートナーです。";
    } else if (data.qChoice === "growth") {
        partner += "最も重要なのは「お互いをリスペクトし合える関係」です。仕事や夢に対して高い志を持ち、あなたが困った時には的確なアドバイスをくれる、良きライバルであり親友のような相手が最適です。";
    } else {
        partner += "最も重要なのは「海のような深い包容力」です。あなたがどれだけ弱音を吐いても、決して否定せずに『大丈夫だよ』と受け止めてくれる、精神的に非常に大人な相手が、あなたの心を最も安定させます。";
    }
    
    // 兄弟構成による相性
    if (data.siblings === "eldest") partner += "\n\nさらに、あなたは長子特有の「しっかりしなきゃ」という責任感を背負いがちです。そのため、あなたの前では完璧でなくても良いと思わせてくれる、甘え上手で素直な愛情表現ができる相手を選ぶと、心のバランスが整います。";
    else if (data.siblings === "middle") partner += "\n\nさらに、あなたは中間子特有の「空気を読んで人に合わせる」癖があります。そのため、あなたの細かな気遣いに気づき、きちんと言葉にして感謝を伝えてくれる、観察眼の鋭い相手を選ぶことが幸せへの近道です。";
    else if (data.siblings === "youngest") partner += "\n\nさらに、あなたは末っ子特有の「愛嬌と人を頼る才能」を持っています。そのため、頼られることに喜びを感じる、面倒見が良くて少しお節介なくらいのリードしてくれる相手が、最もあなたを輝かせてくれます。";
    else if (data.siblings === "only") partner += "\n\nさらに、あなたは一人っ子特有の「自分のペースとパーソナルスペース」を大切にします。そのため、頻繁な連絡を強要せず、お互いのひとりの時間を心から尊重し合える自立した相手が運命の人となります。";

    // 休日の過ごし方
    if (data.holiday === "indoor") partner += "絶対に外せない条件として、休日は家で映画を見たりゴロゴロしたりする「インドアの楽しみ方」の価値観が合う人を選んでください。";
    else if (data.holiday === "outdoor") partner += "絶対に外せない条件として、キャンプやドライブなど、休日のアクティビティを一緒に思い切り楽しめる体力と好奇心のある人を選んでください。";

    
    // --- Generate Advice ---
    let advice = "";
    if (data.hobbies.trim() !== "") {
        const firstHobby = data.hobbies.split(',')[0].trim();
        advice += `【星からの具体的なアクションプラン】\nあなたの強みである「${firstHobby}」に関する活動の場（イベント、オンラインコミュニティ、教室など）に、運命の出会いが潜んでいます。この趣味を深く掘り下げる姿が、特定の誰かの目に非常に魅力的に映る星回りです。`;
    } else {
        advice += "【星からの具体的なアクションプラン】\n今の日常の延長線上には出会いの星がありません。全く新しい趣味や、今まで避けていたジャンルのコミュニティに一歩足を踏み入れることが、運命の歯車を回す鍵となります。";
    }
    
    if (data.dislikes.trim() !== "") {
        const firstDislike = data.dislikes.split(',')[0].trim();
        advice += `\n\n【警告】\nただし、あなたが本能的に拒絶する「${firstDislike}」の気配を少しでも感じる相手には、どれだけ条件が良くても近づいてはいけません。あなたの直感は星からの強力な警告メッセージです。違和感を感じた際は、迷わず距離を置いてください。`;
    }

    if (data.birthplace && data.birthplace !== "秘密") {
        advice += `\n\n【開運のアドバイス】\n恋愛で疲れた時や迷いが生じた時は、「${data.birthplace}」に関連するものに触れることで、あなたの原点回帰となり、直感力がリセットされるでしょう。`;
    }

    // --- DOM Update for Visible Screen (Dark Theme) ---
    document.getElementById('result-title').innerText = title;
    document.getElementById('result-desc').innerText = desc;
    document.getElementById('result-palm-desc').innerText = palmDesc;
    document.getElementById('result-partner').innerText = partner;
    document.getElementById('result-advice').innerText = advice;


    // --- DOM Update for Hidden Resume Template ---
    const today = new Date();
    const reiwaYear = today.getFullYear() - 2018;
    document.getElementById('r-year').innerText = reiwaYear;
    document.getElementById('r-month').innerText = today.getMonth() + 1;
    document.getElementById('r-day').innerText = today.getDate();

    document.getElementById('r-name').innerText = data.name;
    
    if (data.dob) {
        const dObj = new Date(data.dob);
        document.getElementById('r-dob-y').innerText = dObj.getFullYear();
        document.getElementById('r-dob-m').innerText = dObj.getMonth() + 1;
        document.getElementById('r-dob-d').innerText = dObj.getDate();
    } else {
        document.getElementById('r-dob-y').innerText = "―";
        document.getElementById('r-dob-m').innerText = "―";
        document.getElementById('r-dob-d').innerText = "―";
    }

    document.getElementById('r-gender').innerText = data.gender;
    document.getElementById('r-birthplace').innerText = data.birthplace;
    document.getElementById('r-faculty').innerText = data.faculty;
    document.getElementById('r-height').innerText = data.height;
    document.getElementById('r-weight').innerText = data.weight;
    document.getElementById('r-blood').innerText = data.blood;

    if (capturedPalmImage) {
        document.getElementById('r-photo').src = capturedPalmImage;
    }

    document.getElementById('r-title').innerText = title;
    document.getElementById('r-desc').innerText = desc;
    document.getElementById('r-palm-desc').innerText = palmDesc;
    document.getElementById('r-partner').innerText = partner;
    document.getElementById('r-advice').innerText = advice;
}

// 診断結果を画像としてダウンロードする
async function downloadResult() {
    const originalResume = document.getElementById('resume');
    const btn = document.querySelector('.secondary-btn[onclick="downloadResult()"]');
    const originalText = btn.innerText;
    
    btn.innerText = "生成中...";
    btn.disabled = true;

    // 非表示の履歴書テンプレートを複製して画面外に配置
    const clone = originalResume.cloneNode(true);
    
    clone.style.display = 'block'; // 複製した要素を表示状態にする
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = '1600px'; 
    clone.style.minHeight = '1131px'; 
    clone.style.padding = '50px 70px'; 
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#1a1a1a';
    clone.style.borderRadius = '0'; 
    clone.style.boxShadow = 'none'; 
    clone.style.boxSizing = 'border-box';
    
    // スマホなど画面が狭い場合でも強制的に横並びの見開きにする
    const spreadDiv = clone.querySelector('.resume-spread');
    if (spreadDiv) {
        spreadDiv.style.display = 'flex';
        spreadDiv.style.flexDirection = 'row';
        spreadDiv.style.gap = '50px';
    }
    const pages = clone.querySelectorAll('.resume-page');
    pages.forEach(page => {
        page.style.flex = '1';
        page.style.width = '50%';
    });

    document.body.appendChild(clone);

    try {
        const canvas = await html2canvas(clone, {
            backgroundColor: "#ffffff",
            scale: 2 // 高画質化
        });
        
        const link = document.createElement('a');
        link.download = '星導恋愛履歴書_見開き.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error("画像生成エラー:", err);
        alert("画像の保存に失敗しました。");
    } finally {
        // 使い終わったクローンを削除
        document.body.removeChild(clone);
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

