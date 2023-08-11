"use client" // because of term selection

import React, {SetStateAction, useEffect, useState} from "react";
import {ShowcaseListItem} from "@/app/profile/Components/Showcase/ShowcaseListItem";
import {User} from "@/interfaces/UserInterfaces";
import {Artist, Datapoint, Genre, Song, Type} from "@/interfaces/DatabaseInterfaces";
import {getLIName} from "@/analysis_functions/general";

function TermSelection(props: {
    terms: Array<string | null>,
    termIndex: number,
    setTermIndex: React.Dispatch<SetStateAction<number>>
}) {
    const {terms, termIndex, setTermIndex} = props;
    return (
        <div style={{maxWidth: '500px', marginRight: 'auto', flexGrow: '1'}}>
            <h3 style={{margin: 0}}>Time frame</h3>
            <p style={{marginTop: 0}}>Select the range of time to view information for.</p>
            <div className={'terms-container'}>
                {terms.map((t, i) => {
                    return <button type={'button'} onClick={() => setTermIndex(i)} key={t}
                                   className={'subtle-button'} style={terms[termIndex] === t ? {
                        background: 'var(--primary-colour)',
                        color: 'var(--bg-colour)',
                    } : {}}>{terms[i] === 'long_term' ? 'All time' : (terms[i] === 'medium_term' ? '6 months' : '4 weeks')}</button>
                })}
            </div>
        </div>

    );
}


export const ShowcaseList = (props: {
    pageUser: User,
    playlists: any,
    allDatapoints: Datapoint[],
    allPreviousDatapoints: Datapoint[],
    type: string,
    terms: Array<string | null>,
    start: number,
    end: number,
    isOwnPage: boolean,
}) => {
    const {
        pageUser,
        playlists,
        allDatapoints,
        allPreviousDatapoints,
        type,
        terms,
        start,
        end,
        isOwnPage
    } = props;

    const [termIndex, setTermIndex] = useState(2);
    const term = terms[termIndex];
    const [selectedDatapoint, setSelectedDatapoint] = useState(allDatapoints[termIndex]);
    const [selectedPrevDatapoint, setSelectedPrevDatapoint] = useState(allPreviousDatapoints[termIndex]);

    useEffect(() => {
        setSelectedDatapoint(allDatapoints[termIndex]);
        setSelectedPrevDatapoint(allPreviousDatapoints[termIndex]);
    }, [termIndex, allDatapoints, allPreviousDatapoints]);

    return (
        <div className={'showcase-list-wrapper'}>
            <TermSelection {...{terms, termIndex, setTermIndex}} />
            {selectedDatapoint[`top_${type}`].map(function (element: Genre | Artist | Song, index: number) {
                if (index >= start && index <= end) {
                    return (
                        <ShowcaseListItem
                            key={getLIName(element)}
                            {...{allDatapoints, pageUser, playlists, element, index, selectedDatapoint, selectedPrevDatapoint, type, term, isOwnPage}}/>
                    )
                }
            })}
        </div>
    )
}