// happy-dom lacks visualViewport, which Vuetify overlays (v-dialog, v-menu) read on open.
if (!("visualViewport" in globalThis)) {
  Object.defineProperty(globalThis, "visualViewport", {
    configurable: true,
    value: Object.assign(new EventTarget(), {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1,
    }),
  });
}
