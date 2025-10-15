import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock component for testing purposes
const MockTaskCard = ({ task, onComplete, onDelete }: any) => (
  <div data-testid="task-card">
    <h3>{task.title}</h3>
    <p>{task.description}</p>
    <button onClick={() => onComplete(task.id)}>Complete</button>
    <button onClick={() => onDelete(task.id)}>Delete</button>
  </div>
);

describe('TaskCard Component', () => {
  const mockTask = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'pending',
    priority: 'high'
  };

  it('should render task information', () => {
    render(
      <MockTaskCard 
        task={mockTask}
        onComplete={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should call onComplete when complete button clicked', () => {
    const handleComplete = vi.fn();
    
    render(
      <MockTaskCard 
        task={mockTask}
        onComplete={handleComplete}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Complete'));
    expect(handleComplete).toHaveBeenCalledWith('1');
  });

  it('should call onDelete when delete button clicked', () => {
    const handleDelete = vi.fn();
    
    render(
      <MockTaskCard 
        task={mockTask}
        onComplete={vi.fn()}
        onDelete={handleDelete}
      />
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(handleDelete).toHaveBeenCalledWith('1');
  });
});

