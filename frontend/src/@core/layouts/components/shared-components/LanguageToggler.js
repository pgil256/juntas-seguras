import React from 'react';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

const LanguageToggler = () => {
  const { i18n } = useTranslation();

  const handleLanguageToggle = () => {
    const newLanguage = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLanguage);
  };

  return (
    <IconButton color='inherit' aria-haspopup='true' onClick={handleLanguageToggle}>
      <Box
        sx={{
          width: 70,
          height: 25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderRadius: 2,
        }}
      >
        <Typography variant='body2'>
          {i18n.language === 'en' ? 'Español' : 'English'}
        </Typography>
      </Box>
    </IconButton>
  );
};

export default LanguageToggler;
