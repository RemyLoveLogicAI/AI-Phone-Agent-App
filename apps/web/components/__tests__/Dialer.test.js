import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dialer from '../Dialer';

describe('Dialer', () => {
  it('builds numbers with keypad interactions and supports backspace/clear', async () => {
    const user = userEvent.setup();
    render(<Dialer onCallStart={jest.fn()} />);

    await user.click(screen.getByLabelText('Dial 1'));
    await user.click(screen.getByLabelText('Dial 2'));
    await user.click(screen.getByLabelText('Dial 3'));

    expect(screen.getByText('123')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Delete last digit'));
    expect(screen.getByText('12')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Clear number'));
    expect(screen.getByText('Enter number...')).toBeInTheDocument();
  });

  it('calls the provided callback when a number exists', async () => {
    const user = userEvent.setup();
    const onCallStart = jest.fn();

    render(<Dialer onCallStart={onCallStart} />);

    await user.click(screen.getByLabelText('Dial 5'));
    await user.click(screen.getByLabelText('Dial 0'));
    await user.click(screen.getByLabelText('Dial 2'));
    await user.click(screen.getByLabelText('Dial 7'));
    await user.click(screen.getByLabelText('Dial 4'));
    await user.click(screen.getByLabelText('Dial 8'));
    await user.click(screen.getByLabelText('Dial 9'));

    const callButton = screen.getByLabelText('Call number');
    expect(callButton).not.toBeDisabled();

    await user.click(callButton);

    expect(onCallStart).toHaveBeenCalledWith('5027489');
  });

  it('keeps call disabled below the minimum length and normalizes pasted input', async () => {
    const user = userEvent.setup();
    const onCallStart = jest.fn();

    render(<Dialer onCallStart={onCallStart} />);

    const callButton = screen.getByLabelText('Call number');
    const input = screen.getByLabelText('Dialer input');

    await user.type(input, 'abc123!');
    expect(input).toHaveValue('123');
    expect(callButton).toBeDisabled();

    await user.clear(input);
    await user.type(input, '+1 (415) 555-0102 ext.99');
    expect(input).toHaveValue('1415555010299');
    expect(callButton).not.toBeDisabled();

    await user.click(callButton);
    expect(onCallStart).toHaveBeenCalledWith('1415555010299');
  });
});
