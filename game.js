// ---- ゲームエントリーポイント ----
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 800,
  height: 540,
  backgroundColor: '#0b0d12',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
  },
  scene: [Main, PauseScene, StatScene, BackpackScene]
});
