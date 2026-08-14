export const notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found.' });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }

  if (error?.code === 11000) {
    return res.status(409).json({ message: 'Email or phone number already exists.' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Internal server error.' });
};