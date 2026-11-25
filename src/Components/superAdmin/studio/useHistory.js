"use client";

// Undo/redo for the studio's layer state.
//
// History is coalesced by time: a burst of changes (a drag, a slider sweep)
// becomes one undo step. Continuous gestures therefore need no special
// plumbing — the first state of the burst is what gets restored.
//
// markExternal() lets background updates (e.g. a regenerated art layer's new
// object URL) skip history entirely.

import { useCallback, useEffect, useRef, useState } from "react";

const BURST_MS = 450;
const LIMIT = 80;

export default function useHistory(state, setState) {
  const h = useRef({
    undo: [],
    redo: [],
    last: state,
    pending: null,
    timer: null,
    skip: false,
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const [, bump] = useState(0);

  const commit = useCallback(() => {
    const s = h.current;
    if (!s.timer) return;
    clearTimeout(s.timer);
    s.timer = null;
    const prev = s.pending;
    s.pending = null;
    if (!prev || prev === stateRef.current) return;
    s.undo.push(prev);
    if (s.undo.length > LIMIT) s.undo.shift();
    s.redo = [];
  }, []);

  useEffect(() => {
    const s = h.current;
    if (s.skip) {
      s.skip = false;
      s.last = state;
      return;
    }
    if (s.last === state) return;
    const prev = s.last;
    if (s.timer) clearTimeout(s.timer);
    else s.pending = prev;
    s.last = state;
    s.timer = setTimeout(() => {
      s.timer = null;
      const p = s.pending;
      s.pending = null;
      if (!p || p === stateRef.current) return;
      s.undo.push(p);
      if (s.undo.length > LIMIT) s.undo.shift();
      s.redo = [];
      bump((v) => v + 1);
    }, BURST_MS);
  }, [state]);

  const undo = useCallback(() => {
    commit();
    const s = h.current;
    const prev = s.undo.pop();
    if (!prev) return false;
    s.redo.push(stateRef.current);
    s.last = prev;
    setState(prev);
    bump((v) => v + 1);
    return true;
  }, [commit, setState]);

  const redo = useCallback(() => {
    commit();
    const s = h.current;
    const next = s.redo.pop();
    if (!next) return false;
    s.undo.push(stateRef.current);
    s.last = next;
    setState(next);
    bump((v) => v + 1);
    return true;
  }, [commit, setState]);

  const markExternal = useCallback(() => {
    h.current.skip = true;
  }, []);

  const reset = useCallback((next) => {
    const s = h.current;
    if (s.timer) clearTimeout(s.timer);
    s.undo = [];
    s.redo = [];
    s.pending = null;
    s.timer = null;
    s.last = next;
    bump((v) => v + 1);
  }, []);

  const s = h.current;
  return {
    undo,
    redo,
    reset,
    markExternal,
    canUndo: s.undo.length > 0 || !!s.timer,
    canRedo: s.redo.length > 0,
    depth: s.undo.length,
  };
}
