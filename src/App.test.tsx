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

/** Highlighted guitar positions as "string/fret:role", sorted. */
const highlightedFrets = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-highlighted="true"]')]
    .map((dot) => `${dot.getAttribute('data-string')}/${dot.getAttribute('data-fret')}:${dot.getAttribute('data-role')}`)
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

  it('switches between the piano and the guitar neck', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(screen.getByRole('radio', { name: 'Piano' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Guitar' }));
    expect(screen.queryByRole('img', { name: /^Piano keyboard/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Guitar neck showing C major: C, E, G' })).toBeInTheDocument();
    // The open C chord shape is among the marked positions.
    expect(highlightedFrets(container)).toEqual(
      expect.arrayContaining(['1/0:third', '2/1:root', '3/0:fifth', '4/2:third', '5/3:root']),
    );

    await user.click(screen.getByRole('radio', { name: 'Piano' }));
    expect(screen.queryByRole('img', { name: /^Guitar neck/ })).not.toBeInTheDocument();
    expect(highlightedKeys(container)).toEqual(['60:root', '64:third', '67:fifth']);
  });

  it('keeps the guitar neck when the chord changes', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Guitar' }));
    await user.click(screen.getByRole('radio', { name: 'D♯/E♭' }));
    await user.click(screen.getByRole('radio', { name: 'Minor' }));

    expect(screen.getByRole('img', { name: 'Guitar neck showing E♭ minor: E♭, G♭, B♭' })).toBeInTheDocument();
    const gString = [...container.querySelectorAll('[data-string="3"]')].map((dot) => dot.textContent);
    expect(gString).toEqual(['B♭', 'E♭', 'G♭']);
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

  it('shows B major across the octave break', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'B' }));

    expect(chordNotes()).toEqual(['B', 'D♯', 'F♯']);
    expect(highlightedKeys(container)).toEqual(['71:root', '75:third', '78:fifth']);
  });
});
