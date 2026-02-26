import { describe, it, expect } from 'vitest';
import { AnalysisPlugin } from '../../src/core/plugin.js';

describe('AnalysisPlugin', () => {
  it('constructor sets name', () => {
    const p = new AnalysisPlugin('test-plugin');
    expect(p.name).toBe('test-plugin');
  });

  it('onBoardChange is a no-op', () => {
    const p = new AnalysisPlugin('test');
    expect(() => p.onBoardChange({}, {})).not.toThrow();
  });

  it('onEval is a no-op', () => {
    const p = new AnalysisPlugin('test');
    expect(() => p.onEval({}, {}, {})).not.toThrow();
  });

  it('onSettingsChange is a no-op', () => {
    const p = new AnalysisPlugin('test');
    expect(() => p.onSettingsChange({})).not.toThrow();
  });

  it('onEngineReset is a no-op', () => {
    const p = new AnalysisPlugin('test');
    expect(() => p.onEngineReset()).not.toThrow();
  });

  it('getPersistentLayer returns null', () => {
    const p = new AnalysisPlugin('test');
    expect(p.getPersistentLayer(() => ({}))).toBeNull();
  });

  it('destroy is a no-op', () => {
    const p = new AnalysisPlugin('test');
    expect(() => p.destroy()).not.toThrow();
  });
});
