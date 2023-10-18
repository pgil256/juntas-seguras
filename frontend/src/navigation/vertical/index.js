// ** Icon imports
import Login from 'mdi-material-ui/Login'
import Table from 'mdi-material-ui/Table'
import CubeOutline from 'mdi-material-ui/CubeOutline'
import HomeOutline from 'mdi-material-ui/HomeOutline'
import FormatLetterCase from 'mdi-material-ui/FormatLetterCase'
import AccountCogOutline from 'mdi-material-ui/AccountCogOutline'
import CreditCardOutline from 'mdi-material-ui/CreditCardOutline'
import AccountPlusOutline from 'mdi-material-ui/AccountPlusOutline'
import AlertCircleOutline from 'mdi-material-ui/AlertCircleOutline'
import GoogleCirclesExtended from 'mdi-material-ui/GoogleCirclesExtended'
import AccountCash from 'mdi-material-ui/AccountCash'
import AccountGroup from 'mdi-material-ui/AccountGroup'
import { useTranslation } from 'react-i18next';

const navigation = () => {
  const { t } = useTranslation();

  return [
    {
      title: t('Dashboard'),
      icon: HomeOutline,
      path: '/'
    },
    {
      title: t('Account Settings'),
      icon: AccountCogOutline,
      path: '/account-settings'
    },
    {
      sectionTitle: t('Account Settings')
    },
    {
      title: t('Login'),
      icon: Login,
      path: '/pages/login',
      openInNewTab: true
    },
    {
      title: t('Register'),
      icon: AccountPlusOutline,
      path: '/pages/register',
      openInNewTab: true
    },
    {
      title: t('Help'),
      icon: AlertCircleOutline,
      path: '/pages/error',
      openInNewTab: true
    },
    {
      sectionTitle: t('Juntas Settings')
    },
    {
      title: t('Payout'),
      icon: AccountCash,
      path: '/pages/error'
    },
    {
      title: t('Make Payment'),
      icon: CreditCardOutline,
      path: '/pages/error'
    },
    {
      title: t('Membership'),
      path: '/pages/error',
      icon: AccountGroup
    },
    {
      icon: AccountCogOutline,
      title: t('Manage Junta'),
      path: '/pages/error'
    }
  ];
};

export default navigation
