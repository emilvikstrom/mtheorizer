import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CircleOfFifthsView } from './CircleOfFifthsView';

const heading = () => screen.getByRole('heading', { level: 2 });
const listText = (name: string) =>
  within(screen.getByRole('list', { name }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
const triadSymbols = () =>
  within(screen.getByRole('list', { name: 'Diatonic triads' }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.triad__symbol')?.textContent);

describe('CircleOfFifthsView', () => {
  it('starts on C major', () => {
    render(<CircleOfFifthsView />);
    expect(heading()).toHaveTextContent('C major');
    expect(screen.getByRole('radio', { name: 'C major' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('No sharps or flats')).toBeInTheDocument();
    expect(listText('Notes in the scale')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(triadSymbols()).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
  });

  it('has 12 major and 12 minor keys', () => {
    render(<CircleOfFifthsView />);
    const circle = screen.getByRole('radiogroup', { name: /Circle of fifths/ });
    expect(within(circle).getAllByRole('radio')).toHaveLength(24);
  });

  it('selects a key by clicking it', async () => {
    const user = userEvent.setup();
    render(<CircleOfFifthsView />);
    await user.click(screen.getByRole('radio', { name: 'E♭ major' }));

    expect(heading()).toHaveTextContent('E♭ major');
    expect(screen.getByText('3 flats')).toBeInTheDocument();
    expect(listText('Accidentals in the key signature')).toEqual(['B♭', 'E♭', 'A♭']);
    expect(triadSymbols()).toEqual(['E♭', 'Fm', 'Gm', 'A♭', 'B♭', 'Cm', 'D°']);
  });

  it('lets you choose between enharmonic spellings', async () => {
    const user = userEvent.setup();
    render(<CircleOfFifthsView />);
    await user.click(screen.getByRole('radio', { name: 'F♯ major / G♭ major' }));
    expect(heading()).toHaveTextContent('F♯ major');

    await user.click(within(screen.getByRole('group', { name: 'Spelling' })).getByRole('button', { name: 'G♭ major' }));
    expect(heading()).toHaveTextContent('G♭ major');
    expect(listText('Notes in the scale')).toEqual(['G♭', 'A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F']);
    expect(screen.getByRole('radio', { name: 'F♯ major / G♭ major' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows minor keys with the harmonic minor dominant', async () => {
    const user = userEvent.setup();
    render(<CircleOfFifthsView />);
    await user.click(screen.getByRole('radio', { name: 'A minor' }));

    expect(heading()).toHaveTextContent('A minor');
    expect(triadSymbols()).toEqual(['Am', 'B°', 'C', 'Dm', 'Em', 'F', 'G']);
    expect(screen.getByText(/dominant becomes major/)).toHaveTextContent('E (V)');
  });

  it('jumps to related keys', async () => {
    const user = userEvent.setup();
    render(<CircleOfFifthsView />);
    await user.click(screen.getByRole('button', { name: /Relative minor/ }));
    expect(heading()).toHaveTextContent('A minor');

    await user.click(screen.getByRole('button', { name: /Parallel major/ }));
    expect(heading()).toHaveTextContent('A major');

    await user.click(screen.getByRole('button', { name: /^Dominant/ }));
    expect(heading()).toHaveTextContent('E major');

    await user.click(screen.getByRole('button', { name: /^Subdominant/ }));
    expect(heading()).toHaveTextContent('A major');
  });

  it('moves around the circle with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<CircleOfFifthsView />);
    screen.getByRole('radio', { name: 'C major' }).focus();

    await user.keyboard('{ArrowRight}');
    expect(heading()).toHaveTextContent('G major');
    expect(screen.getByRole('radio', { name: 'G major' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(heading()).toHaveTextContent('E minor');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(heading()).toHaveTextContent('D minor');
  });
});
