const params = new URLSearchParams(location.search);
const config = {
  livekitUrl: params.get('lk') || localStorage.getItem('phonecam.lk') || '',
  tokenApi: params.get('api') || localStorage.getItem('phonecam.api') || 'https://phonecam-token-api.onrender.com'
};
const $ = (q) => document.querySelector(q);
const status = (text, live = false) => {
  const el = $('#status');
  if (el) { el.textContent = text; $('#dot')?.classList.toggle('on', live); }
};
function roomFromHash() {
  let room = location.hash.slice(1);
  if (!room) {
    room = `room-${crypto.randomUUID().slice(0, 8)}`;
    history.replaceState(null, '', `#${room}`);
  }
  return room;
}
function setUrl(key, value) {
  config[key] = value;
  localStorage.setItem(key === 'livekitUrl' ? 'phonecam.lk' : 'phonecam.api', value);
}
async function join(role) {
  if (!config.livekitUrl || !config.tokenApi) throw new Error('ตั้งค่า LiveKit URL และ Token API ก่อน');
  const roomName = roomFromHash();
  const response = await fetch(`${config.tokenApi.replace(/\/$/, '')}/token`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ room: roomName, role })
  });
  if (!response.ok) throw new Error((await response.text()) || `Token API error ${response.status}`);
  const { token } = await response.json();
  const { Room, RoomEvent, createLocalVideoTrack, Track } = await import('https://cdn.jsdelivr.net/npm/livekit-client@2.15.6/dist/livekit-client.esm.mjs');
  const room = new Room({ adaptiveStream: true, dynacast: true });
  await room.connect(config.livekitUrl, token);
  return { room, RoomEvent, createLocalVideoTrack, Track, roomName };
}
function renderConfig() {
  const lk = $('#livekitUrl'), api = $('#tokenApi');
  if (!lk || !api) return;
  lk.value = config.livekitUrl; api.value = config.tokenApi;
  $('#saveConfig').onclick = () => {
    setUrl('livekitUrl', lk.value.trim()); setUrl('tokenApi', api.value.trim());
    const next = new URL(location.href); next.searchParams.set('lk', config.livekitUrl); next.searchParams.set('api', config.tokenApi);
    history.replaceState(null, '', next);
    if ($('#phoneLink')) updatePairLink();
    status('บันทึกการตั้งค่าแล้ว');
  };
}
renderConfig();

if (document.body.dataset.page === 'receiver') {
  const roomName = roomFromHash();
  $('#roomCode').textContent = roomName;
  function updatePairLink() {
    const link = new URL('mobile.html', location.href);
    link.search = location.search; link.hash = roomName;
    $('#phoneLink').textContent = link.href;
    $('#qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(link.href)}`;
    $('#copy').onclick = async () => { await navigator.clipboard.writeText(link.href); $('#copy').textContent = 'คัดลอกแล้ว'; };
  }
  updatePairLink();
  $('#connect').onclick = async () => {
    $('#connect').disabled = true;
    try {
      const { room, RoomEvent, Track } = await join('viewer');
      const attach = (publication) => {
        if (publication.kind === Track.Kind.Video && publication.track) {
          const video = $('#feed');
          publication.track.attach(video); $('#empty').hidden = true; video.hidden = false;
          $('#full').hidden = false; status('รับภาพสดแล้ว', true);
        }
      };
      room.on(RoomEvent.TrackSubscribed, (_track, publication) => attach(publication));
      room.remoteParticipants.forEach((p) => p.trackPublications.forEach(attach));
      room.on(RoomEvent.Disconnected, () => status('หลุดการเชื่อมต่อ'));
      status('เข้าห้องแล้ว · รอภาพจากมือถือ', true);
      $('#connect').textContent = 'เชื่อมต่อแล้ว';
    } catch (error) { status(error.message); $('#connect').disabled = false; }
  };
  $('#full').onclick = () => $('#stage').requestFullscreen?.();
}

if (document.body.dataset.page === 'mobile') {
  $('#start').onclick = async () => {
    $('#start').disabled = true;
    try {
      const { room, RoomEvent, createLocalVideoTrack } = await join('publisher');
      const track = await createLocalVideoTrack({ facingMode: 'environment', resolution: { width: 1920, height: 1080 } });
      track.attach($('#camera'));
      await room.localParticipant.publishTrack(track);
      $('#placeholder').hidden = true; $('#camera').hidden = false;
      status('กำลังส่งภาพไปยังคอม', true); $('#start').textContent = 'กำลังถ่ายทอด';
      room.on(RoomEvent.Disconnected, () => status('การเชื่อมต่อขาดหาย'));
    } catch (error) { status(error.message); $('#start').disabled = false; }
  };
  $('#flip').onclick = () => status('สลับกล้องได้โดยหยุดและเริ่มถ่ายทอดใหม่');
}
