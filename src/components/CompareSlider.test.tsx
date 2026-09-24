import { fireEvent, render, screen } from '@testing-library/react';
import { CompareSlider } from './CompareSlider';

describe('CompareSlider', () => {
  it('starts in the middle and moves with the keyboard', () => {
    render(<CompareSlider beforeSrc="b.jpg" afterSrc="a.jpg" />);
    const handle = screen.getByRole('slider');
    expect(handle).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '52');
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true });
    expect(handle).toHaveAttribute('aria-valuenow', '42');
    fireEvent.keyDown(handle, { key: 'End' });
    expect(handle).toHaveAttribute('aria-valuenow', '100');
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '100');
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle).toHaveAttribute('aria-valuenow', '0');
  });

  it('shows both photos, before on top', () => {
    render(<CompareSlider beforeSrc="b.jpg" afterSrc="a.jpg" />);
    const imgs = screen.getAllByRole('img');
    expect(imgs.map((i) => i.getAttribute('alt'))).toEqual(['After', 'Before']);
  });
});
