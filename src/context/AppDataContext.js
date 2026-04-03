import React from 'react';
export const AppDataContext = React.createContext({
  selectedFabrika: null,
  istasyonlar: [],
  oncuToken: null,
  loggedInUser: null,
  logout: () => {},
});
