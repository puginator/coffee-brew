import React, {
    useState,
    useEffect
} from 'react';
import styled from 'styled-components';


const Container = styled.div`
  position: absolute;

  bottom: 5px;
  right: 5px;
  display: grid;
  grid-template: 1fr 1fr / 1fr 1fr;  
`;
const Clock = styled.div`
    grid-column: 1/ -1;
    /* border: 2px dashed white; */
    font-family: 'Orbitron', sans-serif;
    border-radius: 5px;
    justify-self: center;
    font-size: 20px;
    color: #b3b3b3;
    margin: 0;
`;

const Button = styled.button`
  /* background-color:${({primary}) => primary ? "#181818" : "#b3b3b3"};  */
  background-color: transparent;
  color: #b3b3b3;
  font-size: 12px;
  border: none;
  padding: 5px 5px;
`;

const Timer = () => {
    const [seconds, setSeconds] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [isActive, setIsActive] = useState(false);

    function toggle() {
        setIsActive(!isActive);
    }

    function reset() {
        setSeconds(0);
        setMinutes(0)
        setIsActive(false);
    }


    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(seconds => seconds + 1);
            }, 1000);
            if(seconds === 60){
                setMinutes(minutes => minutes + 1);
                setSeconds(0);
            }
        } else if (!isActive && seconds !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);

    }, [isActive, seconds]);

    return (
        <Container>  
            <Clock>
                {minutes < 10 ? `0${minutes}` : minutes}:{ seconds < 10 ? `0${seconds}` : seconds}
            </Clock>
            <Button onClick={toggle}>
                {isActive ? 'Pause' : 'Start'}
            </Button>
            <Button onClick={reset}>
                Reset
            </Button>
        </Container>
    )
}

export default Timer;