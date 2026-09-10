import { useEffect, useState } from 'react';
import type { MediaFile, Slide, SlideEffect } from '../types';
import { SLIDE_EFFECT_OPTIONS } from '../types';
import { mediaApi, slidesApi } from '../api/endpoints';

const emptyForm = {
  id: null as string | null,
  title: '',
  mediaId: '' as string,
  durationSecs: 10,
  backgroundColor: '#000000',
  entranceEffect: 'FADE' as SlideEffect,
  exitEffect: 'FADE' as SlideEffect,
};

type FormState = typeof emptyForm;

const ENTRANCE_ANIMATION: Record<SlideEffect, string | null> = {
  NONE: null,
  FADE: 'anim-fade-in',
  ZOOM_IN: 'anim-zoom-in-enter',
  ZOOM_OUT: 'anim-zoom-out-enter',
  ROTATE: 'anim-rotate-enter',
  SLIDE_LEFT: 'anim-slide-left-enter',
  SLIDE_RIGHT: 'anim-slide-right-enter',
  FLIP: 'anim-flip-enter',
  BLUR: 'anim-blur-enter',
  KEN_BURNS: 'anim-ken-burns-pan',
  BOUNCE: 'anim-bounce-enter',
};

export default function SlidesPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  function refresh() {
    setLoading(true);
    Promise.all([slidesApi.list(), mediaApi.list()])
      .then(([s, m]) => {
        setSlides(s);
        setMedia(m);
      })
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  function editSlide(slide: Slide) {
    setForm({
      id: slide.id,
      title: slide.title,
      mediaId: slide.mediaId ?? '',
      durationSecs: slide.durationSecs,
      backgroundColor: slide.backgroundColor,
      entranceEffect: slide.entranceEffect,
      exitEffect: slide.exitEffect,
    });
    setPreviewKey((k) => k + 1);
  }

  function newSlide() {
    setForm(emptyForm);
    setPreviewKey((k) => k + 1);
  }

  async function onSave() {
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        mediaId: form.mediaId || undefined,
        durationSecs: form.durationSecs,
        backgroundColor: form.backgroundColor,
        entranceEffect: form.entranceEffect,
        exitEffect: form.exitEffect,
      };
      if (form.id) {
        await slidesApi.update(form.id, payload);
      } else {
        await slidesApi.create(payload);
      }
      newSlide();
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar este slide?')) return;
    await slidesApi.remove(id);
    if (form.id === id) newSlide();
    refresh();
  }

  const previewMedia = media.find((m) => m.id === form.mediaId);
  const previewAnimation = ENTRANCE_ANIMATION[form.entranceEffect];
  const previewDurationMs = form.entranceEffect === 'KEN_BURNS' ? 2600 : 700;

  return (
    <div>
      <h1 className="page-title">Slides</h1>
      <div className="slide-editor-layout">
        <div className="slide-list-panel">
          <button className="btn-primary" onClick={newSlide}>
            + Nuevo slide
          </button>
          {loading ? (
            <p>Cargando…</p>
          ) : (
            <ul className="slide-list">
              {slides.map((slide) => (
                <li
                  key={slide.id}
                  className={`slide-list-item${form.id === slide.id ? ' active' : ''}`}
                  onClick={() => editSlide(slide)}
                >
                  <span>{slide.title}</span>
                  <button
                    className="btn-danger-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(slide.id);
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="slide-form-panel">
          <h2>{form.id ? 'Editar slide' : 'Nuevo slide'}</h2>
          <label>
            Título
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Media
            <select
              value={form.mediaId}
              onChange={(e) => {
                setForm({ ...form, mediaId: e.target.value });
                setPreviewKey((k) => k + 1);
              }}
            >
              <option value="">— Sin media (solo color/título) —</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.originalName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Duración (segundos)
            <input
              type="number"
              min={1}
              value={form.durationSecs}
              onChange={(e) => setForm({ ...form, durationSecs: Number(e.target.value) })}
            />
          </label>
          <label>
            Color de fondo
            <input
              type="color"
              value={form.backgroundColor}
              onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
            />
          </label>
          <label>
            Animación de entrada
            <select
              value={form.entranceEffect}
              onChange={(e) => {
                setForm({ ...form, entranceEffect: e.target.value as SlideEffect });
                setPreviewKey((k) => k + 1);
              }}
            >
              {SLIDE_EFFECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Animación de salida
            <select
              value={form.exitEffect}
              onChange={(e) => setForm({ ...form, exitEffect: e.target.value as SlideEffect })}
            >
              {SLIDE_EFFECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" onClick={onSave} disabled={saving || !form.title}>
            {saving ? 'Guardando…' : 'Guardar slide'}
          </button>
        </div>

        <div className="slide-preview-panel">
          <div className="slide-preview-header">
            <h2>Vista previa</h2>
            <button className="btn-ghost-small" onClick={() => setPreviewKey((k) => k + 1)}>
              ▶ Repetir animación
            </button>
          </div>
          <div className="slide-preview-stage">
            <div
              key={previewKey}
              className="slide-preview"
              style={{
                backgroundColor: form.backgroundColor,
                animation: previewAnimation ? `${previewAnimation} ${previewDurationMs}ms ease both` : undefined,
              }}
            >
              {previewMedia ? (
                previewMedia.type === 'IMAGE' ? (
                  <img src={previewMedia.url} alt="" />
                ) : (
                  <video src={previewMedia.url} muted autoPlay loop />
                )
              ) : (
                <span className="slide-preview-title">{form.title || 'Título del slide'}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
