import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                {this.state.error?.message || 'An unexpected error occurred'}
              </AlertDescription>
            </Alert>
            
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                <summary className="cursor-pointer font-semibold text-sm text-slate-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 text-xs overflow-auto max-h-64 text-slate-600">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <Button 
              onClick={this.handleReset}
              className="w-full"
              data-testid="error-boundary-reset-btn"
            >
              <RefreshCw size={16} className="mr-2" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
