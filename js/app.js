/* -------------------------------------------------------
           定数・初期値
        ------------------------------------------------------- */
        const ADMIN_ID = "admin";
        const DEFAULT_LOCAL_USERS = [
            { id: "admin", name: "管理者", pass: "admin1234", isAdmin: true }
        ];

        // ▼ ここにGAS URLを貼り付けると起動時に自動セット（ポップアップ不要）
        //   空文字のままにするとポップアップが表示されます
        const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbyDSLpUjs1YT6EUlFR0rqj7ESlIbu5Ty0mJUXzxs6V0b9PHB99Ltn_o8dkvUwyO4N3hEQ/exec";

        // DEFAULT_GAS_URL が設定されていれば即座にlocalStorageへ書き込む
        // （state初期化より前に実行することでstate.gasUrlに正しく反映される）
        if (DEFAULT_GAS_URL) {
            localStorage.setItem('task_share_gas_url', DEFAULT_GAS_URL);
        }

        const state = {
            currentUser: null,
            globalTasks: [],
            privateTasks: [],
            users: DEFAULT_LOCAL_USERS,
            currentView: "calendar",
            currentDate: new Date(),
            filterScope: "all",
            filterStatus: "all",
            taskScope: "global",
            gasUrl: localStorage.getItem('task_share_gas_url') || "",
            isMorningNotifyEnabled: localStorage.getItem('task_share_morning_notify') !== 'false',
            notifiedTaskIds: JSON.parse(localStorage.getItem('task_share_notified_ids') || "[]"),
            swRegistration: null,
        };

        /* -------------------------------------------------------
           セレクター取得
        ------------------------------------------------------- */
        const gasSetupOverlay     = document.getElementById('gasSetupOverlay');
        const gasSetupInput       = document.getElementById('gasSetupInput');
        const gasSetupSaveBtn     = document.getElementById('gasSetupSaveBtn');
        const gasSetupSkipBtn     = document.getElementById('gasSetupSkipBtn');
        const gasSetupError       = document.getElementById('gasSetupError');
        const loginOverlay        = document.getElementById('loginOverlay');
        const loginForm           = document.getElementById('loginForm');
        const loginUsernameInput  = document.getElementById('loginUsername');
        const loginPasswordInput  = document.getElementById('loginPassword');
        const loginErrorMsg       = document.getElementById('loginErrorMsg');
        const loginGasStatus      = document.getElementById('loginGasStatus');
        const loginGasStatusText  = document.getElementById('loginGasStatusText');
        const loginChangeGasBtn   = document.getElementById('loginChangeGasBtn');
        const mainContent         = document.getElementById('mainContent');
        const currentUserNameEl   = document.getElementById('currentUserName');
        const adminConsoleBtn     = document.getElementById('adminConsoleBtn');
        const logoutBtn           = document.getElementById('logoutBtn');
        const taskForm            = document.getElementById('taskForm');
        const scopeGlobalBtn      = document.getElementById('scopeGlobalBtn');
        const scopePrivateBtn     = document.getElementById('scopePrivateBtn');
        const saveLocationLabel   = document.getElementById('saveLocationLabel');
        const submitBtnText       = document.getElementById('submitBtnText');
        const taskTitleInput      = document.getElementById('taskTitle');
        const taskSubjectInput    = document.getElementById('taskSubject');
        const taskDeadlineInput   = document.getElementById('taskDeadline');
        const taskMemoInput       = document.getElementById('taskMemo');
        const submitBtn           = document.getElementById('submitBtn');
        const connectionStatus    = document.getElementById('connectionStatus');
        const statusDot           = document.getElementById('statusDot');
        const statusTitle         = document.getElementById('statusTitle');
        const statusDesc          = document.getElementById('statusDesc');
        const uncompletedCountEl  = document.getElementById('uncompletedCount');
        const completedCountEl    = document.getElementById('completedCount');
        const totalCountEl        = document.getElementById('totalCount');
        const tabCalendarBtn      = document.getElementById('tabCalendarBtn');
        const tabListBtn          = document.getElementById('tabListBtn');
        const calendarView        = document.getElementById('calendarView');
        const listView            = document.getElementById('listView');
        const listCountLabel      = document.getElementById('listCountLabel');
        const filterScopeSelect   = document.getElementById('filterScope');
        const filterStatusSelect  = document.getElementById('filterStatus');
        const taskListContainer   = document.getElementById('taskListContainer');
        const prevMonthBtn        = document.getElementById('prevMonthBtn');
        const nextMonthBtn        = document.getElementById('nextMonthBtn');
        const calendarMonthLabel  = document.getElementById('calendarMonthLabel');
        const calendarGrid        = document.getElementById('calendarGrid');
        const toastNotification   = document.getElementById('toastNotification');
        const toastMessage        = document.getElementById('toastMessage');
        const toastIcon           = document.getElementById('toastIcon');
        const adminModal          = document.getElementById('adminModal');
        const closeAdminBtn       = document.getElementById('closeAdminBtn');
        const closeAdminFooterBtn = document.getElementById('closeAdminFooterBtn');
        const newUserForm         = document.getElementById('newUserForm');
        const newUserIdInput      = document.getElementById('newUserId');
        const newUserNameInput    = document.getElementById('newUserName');
        const newUserPassInput    = document.getElementById('newUserPass');
        const usersListContainer  = document.getElementById('usersListContainer');
        const userCountLabel      = document.getElementById('userCountLabel');
        const gasUrlInput         = document.getElementById('gasUrlInput');
        const saveGasConfigBtn    = document.getElementById('saveGasConfigBtn');
        const morningNotifyBtn    = document.getElementById('morningNotifyBtn');
        const morningNotifyIcon   = document.getElementById('morningNotifyIcon');
        const morningNotifyText   = document.getElementById('morningNotifyText');
        const loginBtn            = document.getElementById('loginBtn');
        const addUserBtn          = document.getElementById('addUserBtn');
        // パスワード変更オーバーレイ
        const changePassOverlay   = document.getElementById('changePassOverlay');
        const changePassForm      = document.getElementById('changePassForm');
        const newPassInput        = document.getElementById('newPassInput');
        const confirmPassInput    = document.getElementById('confirmPassInput');
        const changePassError     = document.getElementById('changePassError');
        const changePassBtn       = document.getElementById('changePassBtn');
        const passStrengthWrap    = document.getElementById('passStrengthWrap');
        const passStrengthFill    = document.getElementById('passStrengthFill');
        const passStrengthLabel   = document.getElementById('passStrengthLabel');
        const passMatchHint       = document.getElementById('passMatchHint');
        const changePassUsername  = document.getElementById('changePassUsername');

        /* -------------------------------------------------------
           アプリ初期化
        ------------------------------------------------------- */
        window.addEventListener('DOMContentLoaded', async () => {
            // Service Worker 登録
            await registerServiceWorker();

            // キャッシュからユーザー復元
            const cachedUsers = localStorage.getItem('task_share_local_users');
            if (cachedUsers) state.users = JSON.parse(cachedUsers);

            setupEventListeners();
            updateMorningNotifyUI();
            renderCalendar();

            const savedSession = localStorage.getItem('task_share_session');

            if (savedSession) {
                try {
                    const session = JSON.parse(savedSession);
                    const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

                    if (Date.now() - session.loginAt < SESSION_TTL_MS) {
                        const foundUser = session.user;

                        if (foundUser) {
                            state.currentUser = foundUser;

                            if (state.gasUrl) {
                                gasUrlInput.value = state.gasUrl;
                            }

                            loginOverlay.classList.add('hidden');
                            gasSetupOverlay.classList.add('hidden');
                            mainContent.classList.remove('hidden');

                            currentUserNameEl.textContent = foundUser.name;

                            adminConsoleBtn.classList.toggle('hidden', !foundUser.isAdmin);

                            if (state.isMorningNotifyEnabled && Notification.permission === 'granted') {
                                scheduleMorningNotification();
                            }

                            await loadAndSyncData();
                            return;
                        }
                    } else {
                        localStorage.removeItem('task_share_session');
                    }
                } catch (_) {
                    localStorage.removeItem('task_share_session');
                }
            }

            // セッションなし → 通常フロー
            if (!state.gasUrl) {
                showGasSetupOverlay();
            } else {
                gasUrlInput.value = state.gasUrl;
                showLoginOverlay();
            }
        });

        /* -------------------------------------------------------
           PWA: Service Worker 登録
        ------------------------------------------------------- */
        async function registerServiceWorker() {
            if (!('serviceWorker' in navigator)) return;
            try {
                const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
                state.swRegistration = reg;
                console.log('[SW] 登録完了:', reg.scope);
            } catch (err) {
                console.warn('[SW] 登録失敗:', err);
            }
        }

        /* -------------------------------------------------------
           通知: パーミッション要求 & 朝7時スケジューラー
        ------------------------------------------------------- */
        async function requestNotificationPermission() {
            if (!('Notification' in window)) {
                showToast("このブラウザは通知をサポートしていません", "error");
                return false;
            }
            if (Notification.permission === 'granted') return true;
            if (Notification.permission === 'denied') {
                showToast("通知がブロックされています。ブラウザ設定から許可してください", "error");
                return false;
            }
            const result = await Notification.requestPermission();
            return result === 'granted';
        }

        /**
         * 朝7時の通知を送る。
         * setTimeoutで次の7時00分00秒まで待ち、その後は24時間ごとにsetIntervalで繰り返す。
         */
        function scheduleMorningNotification() {
            const now = new Date();
            const next7am = new Date(now);
            next7am.setHours(7, 0, 0, 0);
            if (now >= next7am) next7am.setDate(next7am.getDate() + 1);

            const msUntil7am = next7am - now;

            const fireNotification = () => {
                if (!state.isMorningNotifyEnabled) return;
                const todayStr = new Date().toISOString().slice(0, 10);
                const todayTasks = [
                    ...state.privateTasks.map(t => ({ ...t, isPrivate: true })),
                    ...state.globalTasks.map(t => ({ ...t, isPrivate: false }))
                ].filter(t => t.deadline?.startsWith(todayStr) && t.status !== "完了");

                const body = todayTasks.length > 0
                    ? `本日の未完了タスク: ${todayTasks.slice(0, 3).map(t => t.title).join('、')}${todayTasks.length > 3 ? ` 他${todayTasks.length - 3}件` : ''}`
                    : "本日の予定はありません。良い一日を！";

                sendNotification("📋 タスクシェア - 今日の予定", body, "morning-summary");
            };

            // 次の7時に発火
            const timeoutId = setTimeout(() => {
                fireNotification();
                // 以降24時間ごと
                setInterval(fireNotification, 24 * 60 * 60 * 1000);
            }, msUntil7am);

            console.log(`[通知] 次の朝7時通知まで ${Math.round(msUntil7am / 60000)} 分`);
            return timeoutId;
        }

        /**
         * 通知を実際に発火する（SW経由 or Notification API直接）
         */
        async function sendNotification(title, body, tag = 'taskshare') {
            if (Notification.permission !== 'granted') return;

            if (state.swRegistration) {
                // SW経由で通知（バックグラウンドでも動作）
                state.swRegistration.active?.postMessage({
                    type: 'SHOW_NOTIFICATION',
                    title, body, tag
                });
                // SW がまだ準備できていない場合は直接Notification
                if (!state.swRegistration.active) {
                    new Notification(title, {
                        body,
                        icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png',
                        tag,
                    });
                }
            } else {
                new Notification(title, {
                    body,
                    icon: 'https://cdn-icons-png.flaticon.com/512/906/906334.png',
                    tag,
                });
            }
        }

        function updateMorningNotifyUI() {
            if (state.isMorningNotifyEnabled) {
                morningNotifyIcon.className = "fa-solid fa-sun text-amber-500";
                morningNotifyText.textContent = "朝通知: ON";
                morningNotifyBtn.classList.remove('opacity-50');
            } else {
                morningNotifyIcon.className = "fa-regular fa-sun text-slate-400";
                morningNotifyText.textContent = "朝通知: OFF";
                morningNotifyBtn.classList.add('opacity-50');
            }
        }

        async function handleMorningNotifyToggle() {
            if (!state.isMorningNotifyEnabled) {
                // ONにする → パーミッション要求
                const granted = await requestNotificationPermission();
                if (!granted) return;
                state.isMorningNotifyEnabled = true;
                localStorage.setItem('task_share_morning_notify', 'true');
                scheduleMorningNotification();
                showToast("朝7時の通知を有効にしました");
                // テスト通知
                setTimeout(() => sendNotification("✅ 通知テスト", "朝7時に本日のタスクをお知らせします", "test"), 500);
            } else {
                state.isMorningNotifyEnabled = false;
                localStorage.setItem('task_share_morning_notify', 'false');
                showToast("朝7時の通知を無効にしました");
            }
            updateMorningNotifyUI();
        }

        /* -------------------------------------------------------
           GAS URL 設定ポップアップ
        ------------------------------------------------------- */
        function showGasSetupOverlay() {
            gasSetupOverlay.classList.remove('hidden');
            loginOverlay.classList.add('hidden');
            mainContent.classList.add('hidden');
        }

        function showLoginOverlay() {
            gasSetupOverlay.classList.add('hidden');
            loginOverlay.classList.remove('hidden');
            mainContent.classList.add('hidden');
            updateLoginGasStatusBadge();
        }

        function updateLoginGasStatusBadge() {
            const dot = loginGasStatus.querySelector('i');
            if (state.gasUrl) {
                dot.className = "fa-solid fa-circle text-[8px] text-emerald-500";
                loginGasStatusText.textContent = "GAS: 接続済み";
                loginGasStatus.className = "text-xs px-3 py-1.5 rounded-lg inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700";
            } else {
                dot.className = "fa-solid fa-circle text-[8px] text-slate-400";
                loginGasStatusText.textContent = "GAS: 未設定（ローカルのみ）";
                loginGasStatus.className = "text-xs px-3 py-1.5 rounded-lg inline-flex items-center space-x-1.5 bg-slate-100 text-slate-500";
            }
        }

        function handleGasSetupSave() {
            const url = gasSetupInput.value.trim();
            if (!url.startsWith("https://script.google.com/")) {
                gasSetupError.classList.remove('hidden');
                return;
            }
            gasSetupError.classList.add('hidden');
            state.gasUrl = url;
            localStorage.setItem('task_share_gas_url', url);
            gasUrlInput.value = url;
            showLoginOverlay();
            showToast("GAS URLを保存しました");
        }

        /* -------------------------------------------------------
           GASフェッチ共通関数
        ------------------------------------------------------- */

        /** GAS GET */
        async function gasGet(url) {
            const res = await fetch(url, {
                method: 'GET',
                redirect: 'follow',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        }

        /** GAS POST：Content-Type を text/plain にしてプリフライトを回避 */
        async function gasPost(url, payload) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload),
                    redirect: 'follow',
                });
                if (res.ok) return res.json();
                throw new Error(`HTTP ${res.status}`);
            } catch (err) {
                // 最終フォールバック：no-cors（書き込みのみ、レスポンス読み取り不可）
                console.warn('[GAS POST] fetchが失敗、no-corsにフォールバック:', err.message);
                await fetch(url, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify(payload),
                });
                return { status: 'success', cors: false };
            }
        }

        /* -------------------------------------------------------
           イベントリスナー設定
        ------------------------------------------------------- */
        function setupEventListeners() {
            // GAS設定ポップアップ
            gasSetupSaveBtn.addEventListener('click', handleGasSetupSave);
            gasSetupInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleGasSetupSave(); });
            gasSetupSkipBtn.addEventListener('click', () => {
                state.gasUrl = "";
                showLoginOverlay();
            });
            loginChangeGasBtn.addEventListener('click', showGasSetupOverlay);

            // ログイン
            loginForm.addEventListener('submit', handleLogin);

            // タスクフォーム
            taskForm.addEventListener('submit', handleTaskSubmit);

            // タブ切り替え
            tabCalendarBtn.addEventListener('click', () => switchView("calendar"));
            tabListBtn.addEventListener('click', () => switchView("list"));

            // カレンダー月送り
            prevMonthBtn.addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth() - 1); renderCalendar(); });
            nextMonthBtn.addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth() + 1); renderCalendar(); });

            // フィルター
            filterScopeSelect.addEventListener('change', (e) => { state.filterScope = e.target.value; renderTaskList(); });
            filterStatusSelect.addEventListener('change', (e) => { state.filterStatus = e.target.value; renderTaskList(); });

            // 保存先選択
            scopeGlobalBtn.addEventListener('click', () => setTaskScope("global"));
            scopePrivateBtn.addEventListener('click', () => setTaskScope("private"));

            // ログアウト
            logoutBtn.addEventListener('click', handleLogoutAction);

            // 管理者コンソール
            adminConsoleBtn.addEventListener('click', () => {
                if (!state.currentUser?.isAdmin) return;
                adminModal.classList.remove('hidden');
                renderAdminUsersList();
            });
            const closeAdmin = () => adminModal.classList.add('hidden');
            closeAdminBtn.addEventListener('click', closeAdmin);
            closeAdminFooterBtn.addEventListener('click', closeAdmin);
            newUserForm.addEventListener('submit', handleAddUser);
            saveGasConfigBtn.addEventListener('click', handleSaveGasConfig);

            // 朝通知トグル
            morningNotifyBtn.addEventListener('click', handleMorningNotifyToggle);

            // パスワード変更フォーム
            changePassForm.addEventListener('submit', handleChangePass);
            newPassInput.addEventListener('input', updatePassStrength);
            confirmPassInput.addEventListener('input', updatePassMatch);
        }

        /* -------------------------------------------------------
           トースト表示
        ------------------------------------------------------- */
        function showToast(message, type = "success") {
            toastMessage.textContent = message;
            if (type === "success") {
                toastIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
                toastIcon.className = "text-emerald-400";
            } else {
                toastIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
                toastIcon.className = "text-rose-400";
            }
            toastNotification.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => toastNotification.classList.add('translate-y-20', 'opacity-0'), 3000);
        }

        /* -------------------------------------------------------
           タブ切り替え
        ------------------------------------------------------- */
        function switchView(view) {
            state.currentView = view;
            if (view === "calendar") {
                tabCalendarBtn.className = "flex-1 py-2 px-3 text-sm font-bold rounded-xl bg-indigo-600 text-white";
                tabListBtn.className = "flex-1 py-2 px-3 text-sm font-bold rounded-xl text-slate-600 hover:bg-slate-100";
                calendarView.classList.remove('hidden');
                listView.classList.add('hidden');
            } else {
                tabCalendarBtn.className = "flex-1 py-2 px-3 text-sm font-bold rounded-xl text-slate-600 hover:bg-slate-100";
                tabListBtn.className = "flex-1 py-2 px-3 text-sm font-bold rounded-xl bg-indigo-600 text-white";
                calendarView.classList.add('hidden');
                listView.classList.remove('hidden');
                renderTaskList();
            }
        }

        /* -------------------------------------------------------
           ログイン処理
        ------------------------------------------------------- */
        async function handleLogin(e) {
            e.preventDefault();
            const username = loginUsernameInput.value.trim();
            const password = loginPasswordInput.value.trim();

            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>認証中...</span>';

            let foundUser = null;

            if (state.gasUrl) {
                try {
                    const result = await gasPost(
                        state.gasUrl,
                        {
                            action: "login",
                            id: username,
                            pass: password
                        }
                    );

                    if (result.status === "success") {
                        foundUser = result.user;
                    }
                } catch (err) {
                    console.log("GASログイン失敗、キャッシュを使用します:", err.message);
                }
            }

            // GAS未設定、または通信エラー時のローカルフォールバック
            if (!foundUser) {
                foundUser = state.users.find(u => u.id === username && String(u.pass) === String(password));
            }

            if (foundUser) {
                loginErrorMsg.classList.add('hidden');

                // ── 初回ログイン：パスワード変更が必要 ──
                if (foundUser.mustChangePass === true || foundUser.mustChangePass === "true" || foundUser.mustChangePass === "TRUE") {
                    state.currentUser = foundUser; // 一時保持
                    loginOverlay.classList.add('hidden');
                    changePassUsername.textContent = foundUser.name;  // ユーザー名表示
                    changePassForm.reset();
                    passStrengthWrap.classList.add('hidden');
                    passMatchHint.classList.add('hidden');
                    changePassError.classList.add('hidden');
                    changePassOverlay.classList.remove('hidden');
                    newPassInput.focus();
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span>サインイン</span>';
                    return;
                }

                // 通常ログイン完了
                await completeLogin(foundUser);
            } else {
                loginErrorMsg.classList.remove('hidden');
            }

            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>サインイン</span>';
        }

        /** ログイン完了処理（初回パスワード変更後にも呼ばれる） */
        async function completeLogin(user) {
            state.currentUser = user;
            loginOverlay.classList.add('hidden');
            changePassOverlay.classList.add('hidden');
            mainContent.classList.remove('hidden');

            currentUserNameEl.textContent = user.name;
            adminConsoleBtn.classList.toggle('hidden', !user.isAdmin);

            localStorage.setItem(
                'task_share_session',
                JSON.stringify({
                    user: user,
                    loginAt: Date.now()
                })
            );

            showToast(`${user.name}さん、ログインしました！`);

            if (state.isMorningNotifyEnabled && Notification.permission === 'granted') {
                scheduleMorningNotification();
            }

            await loadAndSyncData();
        }

        function handleLogoutAction() {
            state.currentUser = null;
            loginUsernameInput.value = "";
            loginPasswordInput.value = "";
            // ── セッション削除 ──
            localStorage.removeItem('task_share_session');
            mainContent.classList.add('hidden');
            showLoginOverlay();
            showToast("ログアウトしました");
        }

        /* -------------------------------------------------------
           パスワード表示切替
        ------------------------------------------------------- */
        window.togglePassVis = function(inputId, btn) {
            const input = document.getElementById(inputId);
            const icon  = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fa-regular fa-eye-slash text-sm';
            } else {
                input.type = 'password';
                icon.className = 'fa-regular fa-eye text-sm';
            }
        };

        /* -------------------------------------------------------
           パスワード強度インジケーター（数字専用）
        ------------------------------------------------------- */
        function updatePassStrength() {
            const val = newPassInput.value;

            // 数字以外を自動除去
            if (/[^0-9]/.test(val)) {
                newPassInput.value = val.replace(/[^0-9]/g, '');
            }

            const digits = newPassInput.value.length;
            passStrengthWrap.classList.toggle('hidden', digits === 0);
            if (digits === 0) return;

            // 桁数で強度を評価
            let score, label, color;
            if (digits < 4)      { score = 1; label = `あと ${4 - digits} 桁`;    color = '#f87171'; }
            else if (digits < 6) { score = 3; label = `${digits}桁（普通）`;      color = '#fb923c'; }
            else if (digits < 8) { score = 4; label = `${digits}桁（良い）`;      color = '#facc15'; }
            else                 { score = 5; label = `${digits}桁（とても強い）`; color = '#10b981'; }

            passStrengthFill.style.width           = (score / 5 * 100) + '%';
            passStrengthFill.style.backgroundColor = color;
            passStrengthLabel.textContent          = label;
            passStrengthLabel.style.color          = color;

            updatePassMatch();
        }

        function updatePassMatch() {
            const a = newPassInput.value;
            const b = confirmPassInput.value;

            // 確認欄も数字以外を除去
            if (/[^0-9]/.test(b)) {
                confirmPassInput.value = b.replace(/[^0-9]/g, '');
            }

            if (!confirmPassInput.value) { passMatchHint.classList.add('hidden'); return; }
            passMatchHint.classList.remove('hidden');
            if (a === confirmPassInput.value) {
                passMatchHint.textContent = '✓ パスワードが一致しています';
                passMatchHint.className   = 'text-[10px] font-bold text-emerald-500';
            } else {
                passMatchHint.textContent = '✗ パスワードが一致しません';
                passMatchHint.className   = 'text-[10px] font-bold text-rose-500';
            }
        }

        /* -------------------------------------------------------
           初回パスワード変更処理
        ------------------------------------------------------- */
        async function handleChangePass(e) {
            e.preventDefault();
            const newPass     = newPassInput.value.trim();
            const confirmPass = confirmPassInput.value.trim();

            changePassError.classList.add('hidden');

            if (newPass.length < 4) {
                changePassError.textContent = "パスワードは4桁以上の数字で入力してください";
                changePassError.classList.remove('hidden');
                return;
            }
            if (!/^[0-9]+$/.test(newPass)) {
                changePassError.textContent = "数字のみ使用できます";
                changePassError.classList.remove('hidden');
                return;
            }
            if (newPass !== confirmPass) {
                changePassError.textContent = "パスワードが一致しません";
                changePassError.classList.remove('hidden');
                return;
            }

            changePassBtn.disabled = true;
            changePassBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>保存中...</span>';

            // GASに新パスワードを保存（mustChangePass を削除）
            if (state.gasUrl) {
                try {
                    await gasPost(state.gasUrl, {
                        action: "updateUserPassword",
                        id: state.currentUser.id,
                        newPass,
                    });
                } catch (err) {
                    console.warn("パスワード同期失敗（ローカルのみ更新）:", err.message);
                }
            }

            // ローカルのユーザー情報も更新
            const userInState = state.users.find(u => u.id === state.currentUser.id);
            if (userInState) {
                userInState.pass = newPass;
                delete userInState.mustChangePass;
                state.currentUser = { ...userInState };
                localStorage.setItem('task_share_local_users', JSON.stringify(state.users));
            }

            changePassBtn.disabled = false;
            changePassBtn.innerHTML = '<i class="fa-solid fa-lock"></i><span>パスワードを設定する</span>';

            showToast("パスワードを設定しました！");
            await completeLogin(state.currentUser);
        }

        /* -------------------------------------------------------
           保存先スコープ切り替え
        ------------------------------------------------------- */
        function setTaskScope(scope) {
            state.taskScope = scope;
            if (scope === "global") {
                scopeGlobalBtn.className = "py-1.5 px-2 text-xs font-bold rounded-lg border text-indigo-700 border-indigo-200 bg-indigo-50 flex items-center justify-center space-x-1.5";
                scopePrivateBtn.className = "py-1.5 px-2 text-xs font-bold rounded-lg border text-slate-500 border-slate-200 hover:bg-slate-100 flex items-center justify-center space-x-1.5";
                saveLocationLabel.textContent = "全員に共有送信（スプレッドシート保存）します";
                submitBtnText.textContent = "共有登録（シート同期）";
                submitBtn.className = "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2";
            } else {
                scopeGlobalBtn.className = "py-1.5 px-2 text-xs font-bold rounded-lg border text-slate-500 border-slate-200 hover:bg-slate-100 flex items-center justify-center space-x-1.5";
                scopePrivateBtn.className = "py-1.5 px-2 text-xs font-bold rounded-lg border text-violet-700 border-violet-200 bg-violet-50 flex items-center justify-center space-x-1.5";
                saveLocationLabel.textContent = "あなたの端末だけに保存されます（非公開）";
                submitBtnText.textContent = "自分用（ローカル保存）";
                submitBtn.className = "w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2";
            }
        }

        /* -------------------------------------------------------
           タスク登録
        ------------------------------------------------------- */
        async function handleTaskSubmit(e) {
            e.preventDefault();
            const title    = taskTitleInput.value.trim();
            const subject  = taskSubjectInput.value.trim() || "全般";
            const deadline = taskDeadlineInput.value;
            const memo     = taskMemoInput.value.trim();
            if (!title || !deadline) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>保存中...</span>';

            const taskId  = "task_" + Date.now();
            const newTask = { id: taskId, title, deadline, memo, status: "未着手", subject, createdBy: state.currentUser.name };

            if (state.taskScope === "private") {
                newTask.ownerId = state.currentUser.id;
                state.privateTasks.push(newTask);
                localStorage.setItem('task_share_private_tasks', JSON.stringify(state.privateTasks));
                showToast("自分用の予定を保存しました");
                completeSubmit();
            } else {
                if (!state.gasUrl) {
                    showToast("GASのURLが設定されていないため、共有保存できません。", "error");
                    submitBtn.disabled = false;
                    setTaskScope("global");
                    return;
                }
                try {
                    const result = await gasPost(state.gasUrl, { action: "createTask", ...newTask });
                    if (result.status === "success") {
                        state.globalTasks.push(newTask);
                        localStorage.setItem('task_share_global_tasks', JSON.stringify(state.globalTasks));
                        showToast(result.cors === false ? "スプレッドシートに送信しました（CORS制限のため確認できません）" : "スプレッドシートに共有同期しました！");
                        completeSubmit();
                    } else {
                        throw new Error(result.message || "Unknown error");
                    }
                } catch (err) {
                    console.error(err);
                    showToast("スプレッドシートへの同期に失敗しました。", "error");
                }
            }

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i><span id="submitBtnText">' + (state.taskScope === "global" ? "共有登録（シート同期）" : "自分用（ローカル保存）") + '</span>';
        }

        function completeSubmit() {
            taskForm.reset();
            submitBtn.disabled = false;
            setTaskScope(state.taskScope);
            updateSummaryUi();
            if (state.currentView === "calendar") renderCalendar(); else renderTaskList();
        }

        /* -------------------------------------------------------
           接続ステータスUI
        ------------------------------------------------------- */
        function updateStatusUi(status) {
            connectionStatus.className = "p-4 rounded-2xl border transition-all duration-300 flex items-center space-x-3 ";
            if (status === "online") {
                connectionStatus.classList.add("bg-emerald-50", "border-emerald-200", "text-emerald-800");
                statusDot.className = "w-2.5 h-2.5 bg-emerald-500 rounded-full flex-shrink-0";
                statusTitle.textContent = "スプレッドシート同期中";
                statusDesc.textContent = "リアルタイムで全員のタスクと同期されています。";
            } else if (status === "connecting") {
                connectionStatus.classList.add("bg-amber-50", "border-amber-200", "text-amber-800");
                statusDot.className = "w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0 animate-pulse";
                statusTitle.textContent = "データを読み込み中...";
                statusDesc.textContent = "Googleスプレッドシートに接続しています。";
            } else {
                connectionStatus.classList.add("bg-rose-50", "border-rose-200", "text-rose-800");
                statusDot.className = "w-2.5 h-2.5 bg-rose-500 rounded-full flex-shrink-0";
                statusTitle.textContent = "オフライン / 接続エラー";
                statusDesc.textContent = "システム設定から有効なGASウェブアプリURLを確認してください。";
            }
        }

        /* -------------------------------------------------------
           データ同期
        ------------------------------------------------------- */
        async function loadAndSyncData() {
            const localPriv = localStorage.getItem('task_share_private_tasks');
            state.privateTasks = localPriv ? JSON.parse(localPriv).filter(t => t.ownerId === state.currentUser.id || !t.ownerId) : [];

            if (state.gasUrl) {
                updateStatusUi("connecting");
                try {
                    const data = await gasGet(state.gasUrl);
                    state.globalTasks = data.tasks || [];
                    state.users = data.users || DEFAULT_LOCAL_USERS;
                    localStorage.setItem('task_share_global_tasks', JSON.stringify(state.globalTasks));
                    localStorage.setItem('task_share_local_users', JSON.stringify(state.users));
                    updateStatusUi("online");
                } catch (e) {
                    console.warn('[GAS] データ取得失敗:', e.message);
                    updateStatusUi("error");
                    const cachedGlobal = localStorage.getItem('task_share_global_tasks');
                    if (cachedGlobal) state.globalTasks = JSON.parse(cachedGlobal);
                }
            } else {
                updateStatusUi("offline");
            }
            updateSummaryUi();
            if (state.currentView === "calendar") renderCalendar(); else renderTaskList();
        }

        /* -------------------------------------------------------
           サマリー更新
        ------------------------------------------------------- */
        function updateSummaryUi() {
            const allMyTasks = [...state.privateTasks, ...state.globalTasks];
            const total      = allMyTasks.length;
            const completed  = allMyTasks.filter(t => t.status === "完了").length;
            uncompletedCountEl.textContent = total - completed;
            completedCountEl.textContent   = completed;
            totalCountEl.textContent       = total;
        }

        /* -------------------------------------------------------
           カレンダー描画
        ------------------------------------------------------- */
        function renderCalendar() {
            const year  = state.currentDate.getFullYear();
            const month = state.currentDate.getMonth();
            calendarMonthLabel.textContent = `${year}年 ${month + 1}月`;
            calendarGrid.innerHTML = "";

            const firstDayIndex = new Date(year, month, 1).getDay();
            const lastDay       = new Date(year, month + 1, 0).getDate();
            const today         = new Date();

            for (let i = 0; i < firstDayIndex; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.className = "bg-slate-50/40 border border-slate-100/50 rounded-xl min-h-[50px] p-1";
                calendarGrid.appendChild(emptyCell);
            }

            const allTasks = [
                ...state.privateTasks.map(t => ({ ...t, isPrivate: true })),
                ...state.globalTasks.map(t => ({ ...t, isPrivate: false }))
            ];

            for (let day = 1; day <= lastDay; day++) {
                const dateCell = document.createElement('div');
                const isToday  = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                dateCell.className = `bg-white border border-slate-200 rounded-xl p-1 min-h-[65px] flex flex-col justify-between transition-all hover:bg-slate-50/80 ${isToday ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''}`;

                const dayNum = document.createElement('span');
                dayNum.className = "text-xs font-bold text-slate-700 self-start ml-1 mt-0.5";
                dayNum.textContent = day;
                dateCell.appendChild(dayNum);

                const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayTasks   = allTasks.filter(t => t.deadline?.startsWith(currentStr));

                if (dayTasks.length > 0) {
                    const container = document.createElement('div');
                    container.className = "space-y-0.5 overflow-hidden flex-grow flex flex-col justify-end mt-1";
                    dayTasks.slice(0, 2).forEach(t => {
                        const badge = document.createElement('div');
                        badge.className = `text-[9px] font-bold px-1 py-0.5 rounded truncate ${t.status === "完了" ? 'bg-slate-100 text-slate-400 line-through' : (t.isPrivate ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700')}`;
                        badge.textContent = t.title;
                        container.appendChild(badge);
                    });
                    if (dayTasks.length > 2) {
                        const more = document.createElement('div');
                        more.className = "text-[8px] text-slate-400 font-bold pl-1";
                        more.textContent = `他 ${dayTasks.length - 2} 件`;
                        container.appendChild(more);
                    }
                    dateCell.appendChild(container);
                }
                calendarGrid.appendChild(dateCell);
            }
        }

        /* -------------------------------------------------------
           タスク一覧描画
        ------------------------------------------------------- */
        function renderTaskList() {
            taskListContainer.innerHTML = "";
            let allTasks = [
                ...state.privateTasks.map(t => ({ ...t, isPrivate: true })),
                ...state.globalTasks.map(t => ({ ...t, isPrivate: false }))
            ];
            if (state.filterScope === "global")  allTasks = allTasks.filter(t => !t.isPrivate);
            if (state.filterScope === "private") allTasks = allTasks.filter(t => t.isPrivate);
            if (state.filterStatus === "completed")   allTasks = allTasks.filter(t => t.status === "完了");
            if (state.filterStatus === "uncompleted") allTasks = allTasks.filter(t => t.status !== "完了");

            allTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
            listCountLabel.textContent = `${allTasks.length}件の予定`;

            if (allTasks.length === 0) {
                taskListContainer.innerHTML = `<div class="text-center p-8 bg-white border rounded-2xl text-slate-400 text-xs font-bold">表示条件に合うタスクはありません</div>`;
                return;
            }

            allTasks.forEach(t => {
                const card = document.createElement('div');
                card.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between space-x-3";
                const formattedDate = (t.deadline || "").replace('T', ' ');
                card.innerHTML = `
                    <div class="flex items-start space-x-3">
                        <button onclick="toggleTaskStatus('${t.id}', ${t.isPrivate}, '${t.status}')" class="mt-0.5 text-lg ${t.status === '完了' ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'} transition">
                            <i class="${t.status === '完了' ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i>
                        </button>
                        <div>
                            <div class="flex items-center space-x-2 flex-wrap">
                                <span class="text-xs font-bold px-2 py-0.5 rounded ${t.isPrivate ? 'bg-violet-50 text-violet-600 border border-violet-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}">${t.isPrivate ? '自分用' : '共有ボード'}</span>
                                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">${t.subject}</span>
                                <span class="text-[10px] text-slate-400 font-medium">⏰ ${formattedDate}</span>
                            </div>
                            <h4 class="text-sm font-bold text-slate-800 mt-1.5 ${t.status === '完了' ? 'line-through text-slate-400' : ''}">${t.title}</h4>
                            ${t.memo ? `<p class="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">${t.memo}</p>` : ''}
                            <span class="text-[9px] text-slate-400 block mt-1">作成者: ${t.createdBy || '不明'}</span>
                        </div>
                    </div>
                    <button onclick="deleteTask('${t.id}', ${t.isPrivate})" class="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition self-center">
                        <i class="fa-regular fa-trash-can text-sm"></i>
                    </button>
                `;
                taskListContainer.appendChild(card);
            });
        }

        /* -------------------------------------------------------
           ステータストグル
        ------------------------------------------------------- */
        window.toggleTaskStatus = async function(id, isPrivate, currentStatus) {
            const nextStatus = currentStatus === "完了" ? "未着手" : "完了";
            if (isPrivate) {
                const target = state.privateTasks.find(t => t.id === id);
                if (target) {
                    target.status = nextStatus;
                    localStorage.setItem('task_share_private_tasks', JSON.stringify(state.privateTasks));
                    showToast("ステータスを更新しました");
                    updateSummaryUi(); renderTaskList();
                }
            } else {
                if (!state.gasUrl) return;
                try {
                    const result = await gasPost(state.gasUrl, { action: "updateTaskStatus", id, status: nextStatus });
                    if (result.status === "success") {
                        const target = state.globalTasks.find(t => t.id === id);
                        if (target) target.status = nextStatus;
                        localStorage.setItem('task_share_global_tasks', JSON.stringify(state.globalTasks));
                        showToast("共有ボードのステータスを更新しました");
                        updateSummaryUi(); renderTaskList();
                    }
                } catch (e) {
                    showToast("サーバーとの同期に失敗しました", "error");
                }
            }
        };

        /* -------------------------------------------------------
           タスク削除
        ------------------------------------------------------- */
        window.deleteTask = async function(id, isPrivate) {
            if (!confirm("このタスクを完全に削除しますか？")) return;
            if (isPrivate) {
                state.privateTasks = state.privateTasks.filter(t => t.id !== id);
                localStorage.setItem('task_share_private_tasks', JSON.stringify(state.privateTasks));
                showToast("タスクを削除しました");
                updateSummaryUi(); renderCalendar(); renderTaskList();
            } else {
                if (!state.gasUrl) return;
                try {
                    const result = await gasPost(state.gasUrl, { action: "deleteTask", id });
                    if (result.status === "success") {
                        state.globalTasks = state.globalTasks.filter(t => t.id !== id);
                        localStorage.setItem('task_share_global_tasks', JSON.stringify(state.globalTasks));
                        showToast("共有ボードから削除しました");
                        updateSummaryUi(); renderCalendar(); renderTaskList();
                    }
                } catch (e) {
                    showToast("サーバーからの削除に失敗しました", "error");
                }
            }
        };

        /* -------------------------------------------------------
           管理者: GAS URL保存
        ------------------------------------------------------- */
        function handleSaveGasConfig() {
            const url = gasUrlInput.value.trim();
            if (!url.startsWith("https://script.google.com/")) {
                showToast("正しいGASのウェブアプリURLを入力してください", "error");
                return;
            }
            localStorage.setItem('task_share_gas_url', url);
            state.gasUrl = url;
            showToast("GAS連携URLを保存しました。再接続します。");
            loadAndSyncData();
        }

        /* -------------------------------------------------------
           管理者: ユーザー追加
        ------------------------------------------------------- */
        async function handleAddUser(e) {
            e.preventDefault();
            const id   = newUserIdInput.value.trim();
            const name = newUserNameInput.value.trim();
            const pass = newUserPassInput.value.trim();
            if (!id || !name || !pass) return;
            const newUser = { id, name, pass, isAdmin: false };
            if (state.gasUrl) {
                try {
                    const result = await gasPost(state.gasUrl, { action: "createUser", ...newUser });
                    if (result.status === "success") {
                        state.users.push(newUser);
                        localStorage.setItem('task_share_local_users', JSON.stringify(state.users));
                        showToast(`${name}さんをスプレッドシートに同期追加しました`);
                        newUserForm.reset(); renderAdminUsersList();
                    }
                } catch (e) {
                    showToast("サーバーへのユーザー追加に失敗しました", "error");
                }
            } else {
                state.users.push(newUser);
                localStorage.setItem('task_share_local_users', JSON.stringify(state.users));
                showToast(`${name}さんをローカルに追加しました（未同期）`);
                newUserForm.reset(); renderAdminUsersList();
            }
        }

        /* -------------------------------------------------------
           管理者: ユーザー一覧
        ------------------------------------------------------- */
        function renderAdminUsersList() {
            usersListContainer.innerHTML = "";
            userCountLabel.textContent = `${state.users.length}名`;
            state.users.forEach(u => {
                const item = document.createElement('div');
                item.className = "flex items-center justify-between p-2 bg-white rounded-xl border text-xs";
                item.innerHTML = `
                    <div>
                        <span class="font-bold text-slate-800">${u.name}</span>
                        <span class="text-slate-400 pl-2">ID: ${u.id} | Pass: ${u.pass}</span>
                        ${u.isAdmin ? '<span class="ml-2 text-[9px] bg-indigo-50 text-indigo-600 px-1 py-0.5 font-bold rounded">管理者</span>' : ''}
                    </div>
                    ${u.id !== ADMIN_ID ? `
                        <button onclick="deleteUser('${u.id}')" class="text-slate-300 hover:text-rose-500 p-1">
                            <i class="fa-solid fa-user-minus"></i>
                        </button>
                    ` : '<span>-</span>'}
                `;
                usersListContainer.appendChild(item);
            });
        }

        window.deleteUser = async function(id) {
            if (!confirm("このメンバーを削除しますか？")) return;
            if (state.gasUrl) {
                try {
                    const result = await gasPost(state.gasUrl, { action: "deleteUser", id });
                    if (result.status === "success") {
                        state.users = state.users.filter(u => u.id !== id);
                        localStorage.setItem('task_share_local_users', JSON.stringify(state.users));
                        showToast("メンバーをスプレッドシートから削除しました");
                        renderAdminUsersList();
                    }
                } catch (e) {
                    showToast("ユーザーの同期削除に失敗しました", "error");
                }
            } else {
                state.users = state.users.filter(u => u.id !== id);
                localStorage.setItem('task_share_local_users', JSON.stringify(state.users));
                showToast("メンバーをローカルから削除しました");
                renderAdminUsersList();
            }
        };