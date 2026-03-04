import type { FillPlan } from '@form-forge/core';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PreviewGridCard, shouldTogglePinnedFromKey } from './PreviewGridCard';

const createEntry = (fieldType: 'text' | 'checkbox'): FillPlan['entries'][number] => ({
  fieldId: fieldType === 'checkbox' ? 'agree_terms' : 'full_name',
  fieldType,
  value: fieldType === 'checkbox' ? false : 'Ada',
  confidence: 1,
  source: {
    pageIndex: 0,
    sourceHint: 'ocr',
    bbox: [0.1, 0.2, 0.3, 0.4],
  },
});

type GenericElementProps = {
  children?: ReactNode;
  [key: string]: unknown;
};

const flattenElements = (node: ReactNode): Array<ReactElement<GenericElementProps>> => {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => flattenElements(child));
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return [];
  }

  const element = node as ReactElement<GenericElementProps>;
  return [element, ...flattenElements(element.props.children)];
};

describe('PreviewGridCard', () => {
  it('applies active class and renders debug section when enabled', () => {
    const element = PreviewGridCard({
      entry: createEntry('text'),
      displayLabel: 'Full Name',
      value: '',
      isActive: true,
      showDebugInfo: true,
      onValueChange: vi.fn(),
      onHoverStart: vi.fn(),
      onHoverEnd: vi.fn(),
      onTogglePinned: vi.fn(),
    }) as ReactElement<{ className: string; children?: ReactNode }>;

    expect(element.props.className).toContain('preview-card--active');

    const allNodes = flattenElements(element.props.children);
    const hasSourceLine = allNodes.some((node) => {
      const nodeChildren = node.props.children;
      return Array.isArray(nodeChildren) && nodeChildren.some((child: ReactNode) => typeof child === 'string' && child.includes('Source:'));
    });
    expect(hasSourceLine).toBe(true);
  });

  it('triggers pin toggle on click and Enter/Space keys only', () => {
    const onTogglePinned = vi.fn();
    const element = PreviewGridCard({
      entry: createEntry('text'),
      displayLabel: 'Full Name',
      value: '',
      isActive: false,
      showDebugInfo: false,
      onValueChange: vi.fn(),
      onHoverStart: vi.fn(),
      onHoverEnd: vi.fn(),
      onTogglePinned,
    }) as ReactElement<{
      onClick: () => void;
      onKeyDown: (event: { key: string; preventDefault: () => void }) => void;
    }>;

    const preventDefault = vi.fn();
    element.props.onClick();
    element.props.onKeyDown({ key: 'Enter', preventDefault });
    element.props.onKeyDown({ key: ' ', preventDefault });
    element.props.onKeyDown({ key: 'Escape', preventDefault });

    expect(onTogglePinned).toHaveBeenCalledTimes(3);
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });

  it('emits typed values for text and checkbox inputs', () => {
    const onTextChange = vi.fn();
    const textElement = PreviewGridCard({
      entry: createEntry('text'),
      displayLabel: 'Full Name',
      value: '',
      isActive: false,
      showDebugInfo: false,
      onValueChange: onTextChange,
      onHoverStart: vi.fn(),
      onHoverEnd: vi.fn(),
      onTogglePinned: vi.fn(),
    }) as ReactElement<{ children?: ReactNode }>;

    const textInput = flattenElements(textElement.props.children).find(
      (node) => node.type === 'input' && node.props.type === 'text',
    ) as ReactElement<{ onChange: (event: { target: { value: string } }) => void }>;
    textInput.props.onChange({ target: { value: 'Ada Lovelace' } });
    expect(onTextChange).toHaveBeenCalledWith('Ada Lovelace');

    const onCheckboxChange = vi.fn();
    const checkboxElement = PreviewGridCard({
      entry: createEntry('checkbox'),
      displayLabel: 'Agree Terms',
      value: false,
      isActive: false,
      showDebugInfo: false,
      onValueChange: onCheckboxChange,
      onHoverStart: vi.fn(),
      onHoverEnd: vi.fn(),
      onTogglePinned: vi.fn(),
    }) as ReactElement<{ children?: ReactNode }>;

    const checkboxInput = flattenElements(checkboxElement.props.children).find(
      (node) => node.type === 'input' && node.props.type === 'checkbox',
    ) as ReactElement<{ onChange: (event: { target: { checked: boolean } }) => void }>;
    checkboxInput.props.onChange({ target: { checked: true } });
    expect(onCheckboxChange).toHaveBeenCalledWith(true);
  });
});

describe('shouldTogglePinnedFromKey', () => {
  it('matches Enter and Space only', () => {
    expect(shouldTogglePinnedFromKey('Enter')).toBe(true);
    expect(shouldTogglePinnedFromKey(' ')).toBe(true);
    expect(shouldTogglePinnedFromKey('Escape')).toBe(false);
  });
});
