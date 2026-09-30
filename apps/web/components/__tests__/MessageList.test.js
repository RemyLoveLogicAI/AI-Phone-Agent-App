import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageList from '../MessageList';

const baseMessages = [
  {
    id: 'm1',
    direction: 'inbound',
    from: '+15551230001',
    to: '+15559870000',
    body: 'First inbound',
    dateSent: '2025-01-01T10:00:00.000Z',
  },
  {
    id: 'm1b',
    direction: 'inbound',
    from: '+15551230001',
    to: '+15559870000',
    body: 'Second inbound',
    dateSent: '2025-01-01T10:01:00.000Z',
  },
  {
    id: 'm2',
    direction: 'inbound',
    from: '+15557654321',
    to: '+15559870000',
    body: 'Need urgent help',
    dateSent: '2025-01-01T10:05:00.000Z',
  },
];

describe('MessageList', () => {
  it('filters contacts by search query', async () => {
    const user = userEvent.setup();
    render(<MessageList messages={baseMessages} />);

    const searchInput = screen.getByLabelText('Search contacts');
    await user.type(searchInput, '0001');

    expect(screen.getAllByText('+15551230001').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('+15557654321')).toHaveLength(0);
  });

  it('clears unread badge after opening a contact', async () => {
    const user = userEvent.setup();
    render(<MessageList messages={baseMessages} />);

    expect(screen.getByText(/^1$/)).toBeInTheDocument();

    await user.click(screen.getByText('+15557654321'));

    expect(screen.queryByText(/^1$/)).not.toBeInTheDocument();
  });
});
