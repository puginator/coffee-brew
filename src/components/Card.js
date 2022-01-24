import React from 'react';
import styled from 'styled-components';


const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyledCard = styled.div`
  background-color: #b3b3b3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 300px;
  height: 400px;
  border-radius: 5px;
  border: 3px solid #181818;
  box-shadow: 0px 0px 15px 3px #b3b3b3;
  transition: transform 0.8s;
  transform-style: preserve-3d;


`;
const StyledSubtitle = styled.h2`
  color: #ffffff;
  font-size: 2rem;
  text-align: center;
`;
const StyledLogo = styled.img`
  src: url(${({src}) => src});
  width: 100px;
  min-height: 150px;
  object-fit: contain;
`;

const StyledRecipeHeader = styled.h5`
  color: #181818;
  text-align: center;
  margin: 10px;
`;


const StyledRecipe = styled.p`
  color: #ffffff;
  border: 3px solid #b3b3b3;
  border-radius: 5px;
  font-size: 12px;
  margin: 0 0 75px;
  padding: 5px;
  text-align: center;
  background-color: #181818;
`;


const StyledButton = styled.button`
  background-color:${({primary}) => primary ? "#181818" : "#b3b3b3"}; 
  position: absolute;
  color: #ffffff;
  font-size: 15px;
  bottom: 10px;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  margin-top: 15px;
`;


const NewCard = ( { recipe, handleClick } ) => {
    
    return (
        <Container>
            <StyledCard>
                <StyledSubtitle>{recipe.name}</StyledSubtitle>
                <StyledLogo src={recipe.image} alt={recipe.name}/>
                <StyledRecipeHeader>Things Needed:</StyledRecipeHeader>
                <StyledRecipe>{recipe.recipe}</StyledRecipe>
                <StyledButton onClick={handleClick} primary>Brew</StyledButton>
            </StyledCard>
        </Container>
    )
}

export default NewCard