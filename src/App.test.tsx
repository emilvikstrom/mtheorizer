import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

const chordNotes = () =>
  within(screen.getByRole('list', { name: 'Notes in the chord' }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.tone__note')?.textContent);

/** Highlighted piano keys as "midi:role", sorted. */
const highlightedKeys = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-highlighted="true"]')]
    .map((key) => `${key.getAttribute('data-midi')}:${key.getAttribute('data-role')}`)
    .sort();

describe('App', () => {
  it('starts on C major', () => {
    const { container } = render(<App />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('C major');
    expect(chordNotes()).toEqual(['C', 'E', 'G']);
    expect(screen.getByRole('img', { name: 'Piano keyboard showing C major: C, E, G' })).toBeInTheDocument();
    expect(highlightedKeys(container)).toEqual(['60:root', '64:third', '67:fifth']);
  });

  it('offers all 12 roots and both qualities', () => {
    render(<App />);
    expect(within(screen.getByRole('group', { name: 'Root' })).getAllByRole('radio')).toHaveLength(12);
    expect(within(screen.getByRole('group', { name: 'Quality' })).getAllByRole('radio')).toHaveLength(2);
  });

  it('spells E♭ minor with flats', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'D♯/E♭' }));
    await user.click(screen.getByRole('radio', { name: 'Minor' }));

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('E♭ minor');
    expect(chordNotes()).toEqual(['E♭', 'G♭', 'B♭']);
    expect(highlightedKeys(container)).toEqual(['63:root', '66:third', '70:fifth']);
  });

  it('spells the C♯/D♭ key as D♭ major but C♯ minor', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'C♯/D♭' }));
    expect(chordNotes()).toEqual(['D♭', 'F', 'A♭']);

    await user.click(screen.getByRole('radio', { name: 'Minor' }));
    expect(chordNotes()).toEqual(['C♯', 'E', 'G♯']);
  });

  it('switches between the chord and circle of fifths tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Chords' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Circle of fifths' }));
    expect(screen.getByRole('tab', { name: 'Circle of fifths' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Circle of fifths');
    expect(screen.getByRole('radiogroup', { name: /Circle of fifths/ })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Root' })).not.toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Chords' })).toHaveFocus();
    expect(screen.getByRole('group', { name: 'Root' })).toBeInTheDocument();
  });

  it('shows B major across the octave break', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'B' }));

    expect(chordNotes()).toEqual(['B', 'D♯', 'F♯']);
    expect(highlightedKeys(container)).toEqual(['71:root', '75:third', '78:fifth']);
  });
});
