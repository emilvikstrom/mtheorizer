import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

const notesIn = (listName: string) =>
  within(screen.getByRole('list', { name: listName }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.tone__note')?.textContent);

const chordNotes = () => notesIn('Notes in the chord');
const scaleNotes = () => notesIn('Notes in the scale');

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

  it('switches between the chord and circle of fifths tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Chords & scales' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Circle of fifths' }));
    expect(screen.getByRole('tab', { name: 'Circle of fifths' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Circle of fifths');
    expect(screen.getByRole('radiogroup', { name: /Circle of fifths/ })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Root' })).not.toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Chords & scales' })).toHaveFocus();
    expect(screen.getByRole('group', { name: 'Root' })).toBeInTheDocument();
  });

  it('shows B major across the octave break', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'B' }));

    expect(chordNotes()).toEqual(['B', 'D♯', 'F♯']);
    expect(highlightedKeys(container)).toEqual(['71:root', '75:third', '78:fifth']);
  });

  describe('scales', () => {
    it('switches to the major scale on the same root', async () => {
      const user = userEvent.setup();
      const { container } = render(<App />);
      await user.click(screen.getByRole('radio', { name: 'Scale' }));

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('C major scale');
      expect(scaleNotes()).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
      expect(screen.queryByRole('group', { name: 'Quality' })).not.toBeInTheDocument();
      expect(within(screen.getByRole('group', { name: 'Scale' })).getAllByRole('radio')).toHaveLength(2);
      expect(within(screen.getByRole('group', { name: 'Tonic' })).getAllByRole('radio')).toHaveLength(12);
      expect(
        screen.getByRole('img', { name: 'Piano keyboard showing C major scale: C, D, E, F, G, A, B, C' }),
      ).toBeInTheDocument();
      expect(highlightedKeys(container)).toEqual([
        '60:degree-1',
        '62:degree-2',
        '64:degree-3',
        '65:degree-4',
        '67:degree-5',
        '69:degree-6',
        '71:degree-7',
        '72:degree-8',
      ]);
    });

    it('shows E♭ natural minor with flats', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole('radio', { name: 'Scale' }));
      await user.click(screen.getByRole('radio', { name: 'D♯/E♭' }));
      await user.click(screen.getByRole('radio', { name: 'Natural minor' }));

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('E♭ natural minor scale');
      expect(scaleNotes()).toEqual(['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C♭', 'D♭']);
    });

    it('keeps root and major/minor when switching between chord and scale', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole('radio', { name: 'A' }));
      await user.click(screen.getByRole('radio', { name: 'Minor' }));
      await user.click(screen.getByRole('radio', { name: 'Scale' }));

      expect(screen.getByRole('radio', { name: 'Natural minor' })).toBeChecked();
      expect(scaleNotes()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);

      await user.click(screen.getByRole('radio', { name: 'Major' }));
      await user.click(screen.getByRole('radio', { name: 'Chord' }));
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('A major');
      expect(chordNotes()).toEqual(['A', 'C♯', 'E']);
    });

    it('shows a scale on the guitar neck', async () => {
      const user = userEvent.setup();
      const { container } = render(<App />);
      await user.click(screen.getByRole('radio', { name: 'Scale' }));
      await user.click(screen.getByRole('radio', { name: 'Guitar' }));

      expect(
        screen.getByRole('img', { name: 'Guitar neck showing C major scale: C, D, E, F, G, A, B' }),
      ).toBeInTheDocument();
      // The low E string, frets 0–5: E F G A, skipping F♯ and G♯ at frets 2 and 4.
      const lowE = [...container.querySelectorAll('[data-string="6"]')]
        .filter((dot) => Number(dot.getAttribute('data-fret')) <= 5)
        .map((dot) => `${dot.getAttribute('data-fret')}:${dot.textContent}`);
      expect(lowE).toEqual(['0:E', '1:F', '3:G', '5:A']);
      expect(container.querySelector('[data-string="5"][data-fret="3"]')).toHaveAttribute('data-role', 'degree-1');
    });
  });
});

