(() => {
  const form = document.getElementById('settingsForm');
  const toast = document.getElementById('toast');
  const saveBtn = document.getElementById('saveBtn');
  const pickLogDir = document.getElementById('pickLogDir');
  const appVersion = document.getElementById('appVersion');
  const configPathHint = document.getElementById('configPathHint');

  const BOOL_FIELDS = [
    'fullscreen',
    'alwaysOnTop',
    'showFrame',
    'startMaximized',
    'kiosk',
    'openDevTools',
    'allowMultiInstance',
    'confirmOnClose',
    'hardwareAcceleration',
    'ignoreCertificateErrors'
  ];

  const NUMBER_FIELDS = ['windowWidth', 'windowHeight'];

  function showToast(message, isError = false) {
    toast.hidden = false;
    toast.textContent = message;
    toast.classList.toggle('error', !!isError);
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function fillForm(config) {
    const elements = form.elements;
    Object.keys(config).forEach((key) => {
      const el = elements.namedItem(key);
      if (!el) return;
      if (el.type === 'checkbox') {
        el.checked = !!config[key];
      } else if (config[key] !== undefined && config[key] !== null) {
        el.value = config[key];
      }
    });
  }

  function readForm() {
    const data = {};
    const elements = form.elements;
    for (const el of elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (NUMBER_FIELDS.includes(el.name)) {
        data[el.name] = Number(el.value) || 0;
      } else {
        data[el.name] = el.value;
      }
    }
    BOOL_FIELDS.forEach((k) => {
      if (!(k in data)) data[k] = false;
    });
    return data;
  }

  async function init() {
    try {
      const [defaults, existing, version, configPath] = await Promise.all([
        window.settingsApi.getDefaults(),
        window.settingsApi.getConfig(),
        window.settingsApi.getAppVersion(),
        window.settingsApi.getConfigPath()
      ]);
      fillForm({ ...defaults, ...(existing || {}) });
      appVersion.textContent = `v${version}`;
      configPathHint.textContent = `配置将保存到：${configPath}`;
    } catch (err) {
      showToast(`初始化失败：${err.message || err}`, true);
    }
  }

  pickLogDir.addEventListener('click', async () => {
    const dir = await window.settingsApi.pickDirectory();
    if (dir) {
      form.elements.namedItem('logPath').value = dir;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = readForm();
    if (!config.projectUrl || !String(config.projectUrl).trim()) {
      showToast('请填写项目 URL', true);
      return;
    }

    saveBtn.disabled = true;
    saveBtn.querySelector('span').textContent = '保存中…';
    try {
      const result = await window.settingsApi.saveConfig(config);
      if (result && result.ok) {
        showToast('配置已保存，正在启动…');
      } else {
        throw new Error('保存失败');
      }
    } catch (err) {
      showToast(`保存失败：${err.message || err}`, true);
      saveBtn.disabled = false;
      saveBtn.querySelector('span').textContent = '保存并启动';
    }
  });

  init();
})();
